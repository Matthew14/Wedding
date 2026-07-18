import type { S3Event } from "aws-lambda";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import heicConvert from "heic-convert";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    ScanCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
    RekognitionClient,
    IndexFacesCommand,
    SearchFacesCommand,
    DetectLabelsCommand,
} from "@aws-sdk/client-rekognition";
import { randomUUID } from "node:crypto";
import type { Readable } from "stream";

const s3 = new S3Client({});
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
});
const rekognition = new RekognitionClient({});

const PHOTOS_TABLE = process.env.PHOTOS_TABLE ?? "wedding-photos";
const FACES_TABLE = process.env.FACES_TABLE ?? "wedding-photo-faces";
const COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID ?? "wedding-faces-2026";
const FACE_MATCH_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD ?? "95");

// Upper bound on the original file we will buffer into memory, so a single
// oversized object cannot OOM-crash the function. Guest uploads are capped at
// 20 MB by the upload-url API; the margin above that exists for bulk-imported
// professional photos, which ran up to ~28 MB.
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

// Memory is really driven by decoded megapixels, not file bytes — a small,
// heavily-compressed JPEG can still decode to a huge pixel buffer. sharp
// enforces this bound at decode time and throws a normal JS error, which the
// per-record catch turns into graceful degradation (unlike an OOM, which
// kills the whole execution environment). 100 MP decodes to ~300 MB of RGB,
// comfortably inside the 1536 MB function.
const MAX_INPUT_PIXELS = 100_000_000;

// The S3 OBJECT_CREATED event can race ahead of the API route's photo insert,
// in which case the byS3Key lookup below finds nothing. Retry a few times with
// exponential backoff before giving up.
const MAX_UPDATE_ATTEMPTS = 5;

// Direct-invoke payload from the dashboard's "Re-match unassigned" button
// (the Next.js app has no Rekognition permissions, so it delegates here).
interface RematchEvent {
    action: "rematch_faces";
}

export async function handler(event: S3Event | RematchEvent): Promise<void> {
    if ("action" in event && event.action === "rematch_faces") {
        await rematchUnassignedFaces();
        return;
    }
    for (const record of (event as S3Event).Records) {
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
        try {
            await processPhoto(key, record.s3.bucket.name);
        } catch (err) {
            // graceful degradation: thumbnail_key stays null
            console.error(`Failed to process ${key}:`, err);
        }
    }
}

// Give every unassigned, unignored face another chance to be matched: as the
// admin labels clusters, the collection fills with labeled anchors, so faces
// that had no decisive match earlier may have one now. Only the still-
// unlabeled rows are touched — assignments and ignores are never overwritten.
async function rematchUnassignedFaces(): Promise<void> {
    const faces: { face_id: string; invitee_id?: number; ignored?: boolean }[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
        const page = await docClient.send(
            new ScanCommand({
                TableName: FACES_TABLE,
                // Only the fields the filter needs — no point hauling
                // bounding boxes for thousands of already-decided rows.
                ProjectionExpression: "face_id, invitee_id, #ig",
                ExpressionAttributeNames: { "#ig": "ignored" },
                ExclusiveStartKey: lastKey,
            })
        );
        faces.push(...((page.Items ?? []) as typeof faces));
        lastKey = page.LastEvaluatedKey;
    } while (lastKey);

    const candidates = faces.filter(
        (f) =>
            f.invitee_id == null &&
            !f.ignored &&
            // Dog detections are DetectLabels output, not collection members —
            // SearchFaces on their synthetic ids would fail.
            !f.face_id.startsWith("dog-")
    );
    console.log(`Re-matching ${candidates.length} unassigned faces of ${faces.length} total`);

    let assigned = 0;
    let ignored = 0;
    const CONCURRENCY = 3;
    for (let i = 0; i < candidates.length; i += CONCURRENCY) {
        await Promise.all(
            candidates.slice(i, i + CONCURRENCY).map(async (face) => {
                try {
                    const match = await findLabeledMatch(face.face_id);
                    if (!match) return;
                    await docClient.send(
                        new UpdateCommand({
                            TableName: FACES_TABLE,
                            Key: { face_id: face.face_id },
                            UpdateExpression: match.ignored
                                ? "SET cluster_id = :cluster, ignored = :ignored"
                                : "SET cluster_id = :cluster, invitee_id = :invitee, invitation_id = :invitation",
                            ExpressionAttributeValues: match.ignored
                                ? { ":cluster": match.cluster_id, ":ignored": true }
                                : {
                                      ":cluster": match.cluster_id,
                                      ":invitee": match.invitee_id,
                                      ":invitation": match.invitation_id,
                                  },
                        })
                    );
                    if (match.ignored) ignored++;
                    else assigned++;
                } catch (err) {
                    console.error(`Re-match failed for face ${face.face_id}:`, err);
                }
            })
        );
    }
    console.log(`Re-match done: ${assigned} auto-assigned, ${ignored} auto-ignored`);
}

interface FaceAssignment {
    cluster_id: string;
    invitee_id?: number;
    invitation_id?: number;
    ignored?: boolean;
}

// Search the collection for faces similar to the given one and return the
// first match (in similarity order) whose faces-table row satisfies the
// predicate. Shared by upload-time assignment and the re-match pass so their
// search tuning can't drift apart.
async function findMatchingRow(
    faceId: string,
    accept: (item: FaceAssignment) => boolean
): Promise<FaceAssignment | null> {
    const search = await rekognition.send(
        new SearchFacesCommand({
            CollectionId: COLLECTION_ID,
            FaceId: faceId,
            FaceMatchThreshold: FACE_MATCH_THRESHOLD,
            MaxFaces: 10,
        })
    );
    for (const match of search.FaceMatches ?? []) {
        const matchedId = match.Face?.FaceId;
        if (!matchedId) continue;
        const row = await docClient.send(
            new GetCommand({ TableName: FACES_TABLE, Key: { face_id: matchedId } })
        );
        const item = row.Item as (Partial<FaceAssignment> & { cluster_id?: string }) | undefined;
        if (!item?.cluster_id) continue;
        const candidate: FaceAssignment = {
            cluster_id: item.cluster_id,
            invitee_id: item.invitee_id,
            invitation_id: item.invitation_id,
            ignored: item.ignored,
        };
        if (accept(candidate)) return candidate;
    }
    return null;
}

// Only decisive outcomes count for re-matching: the best match that is
// itself labeled (assigned to a person, or ignored). Matching another
// unlabeled face wouldn't move the admin's queue forward.
function findLabeledMatch(faceId: string): Promise<FaceAssignment | null> {
    return findMatchingRow(faceId, (item) => item.invitee_id != null || !!item.ignored);
}

async function processPhoto(key: string, bucket: string): Promise<void> {
    // key: uploads/original/{code}/{uuid}.ext
    const parts = key.split("/");
    if (parts.length < 4) throw new Error(`Unexpected key format: ${key}`);
    const code = parts[2];
    const fileName = parts[3];
    const uuid = fileName.substring(0, fileName.lastIndexOf("."));

    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (obj.ContentLength != null && obj.ContentLength > MAX_IMAGE_BYTES) {
        throw new Error(
            `Object ${key} is ${obj.ContentLength} bytes, exceeds ${MAX_IMAGE_BYTES} limit`
        );
    }
    let buffer = await streamToBuffer(obj.Body as Readable, MAX_IMAGE_BYTES);

    // sharp's prebuilt libvips has no HEVC decoder (patent licensing), so
    // iPhone-default HEIC/HEIF uploads must be decoded in WASM first.
    // heic-convert applies the file's rotation/mirror transforms during
    // decode but drops metadata, so the EXIF capture date is pulled from the
    // ORIGINAL bytes — extractDateTimeOriginal only pattern-scans, and the
    // EXIF block inside a HEIC container scans the same as a raw EXIF buffer.
    const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    let takenAt: string | null = null;
    if (ext === ".heic" || ext === ".heif") {
        takenAt = extractDateTimeOriginal(buffer);
        buffer = Buffer.from(
            new Uint8Array(await heicConvert({ buffer, format: "JPEG", quality: 0.9 }))
        );
    }

    const image = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).rotate(); // auto-rotate using EXIF orientation
    const metadata = await image.metadata();
    if (!takenAt) takenAt = metadata.exif ? extractDateTimeOriginal(metadata.exif) : null;

    const { data, info } = await image
        .withMetadata(false) // strip EXIF from thumbnail
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer({ resolveWithObject: true });

    const thumbKey = `uploads/thumbnail/${code}/${uuid}.jpg`;

    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: thumbKey,
            Body: data,
            ContentType: "image/jpeg",
        })
    );

    const photoId = await updatePhotoRecord(key, thumbKey, info.width, info.height, takenAt);

    // Face indexing and dog detection are strictly best-effort: a Rekognition
    // or faces-table failure must never break the thumbnail pipeline the
    // gallery depends on. They're independent calls, so run them concurrently.
    const [faceResult, dogResult] = await Promise.allSettled([
        indexAndAssignFaces(bucket, thumbKey, photoId),
        detectDogs(bucket, thumbKey, photoId),
    ]);
    if (faceResult.status === "rejected") {
        console.error(`Face indexing failed for ${key} (photo ${photoId}):`, faceResult.reason);
    }
    if (dogResult.status === "rejected") {
        console.error(`Dog detection failed for ${key} (photo ${photoId}):`, dogResult.reason);
    }
}

// Dog detections make Maggie searchable in the gallery's people search. Each
// detection becomes an UNASSIGNED singleton row (other dogs attended the
// wedding, so a new dog is never auto-assumed to be Maggie) — it surfaces as
// an unassigned card in the dashboard for the admin to assign or ignore.
async function detectDogs(bucket: string, thumbKey: string, photoId: string): Promise<void> {
    const photo = await docClient.send(
        new GetCommand({
            TableName: PHOTOS_TABLE,
            Key: { id: photoId },
            ConsistentRead: true,
            ProjectionExpression: "dog_scanned_at",
        })
    );
    if (photo.Item?.dog_scanned_at) return;

    const result = await rekognition.send(
        new DetectLabelsCommand({
            Image: { S3Object: { Bucket: bucket, Name: thumbKey } },
            Features: ["GENERAL_LABELS"],
            Settings: { GeneralLabels: { LabelInclusionFilters: ["Dog"] } },
            MinConfidence: 70,
        })
    );

    for (const label of result.Labels ?? []) {
        for (const instance of label.Instances ?? []) {
            const box = instance.BoundingBox;
            if (!box) continue;
            await docClient.send(
                new PutCommand({
                    TableName: FACES_TABLE,
                    Item: {
                        face_id: `dog-${randomUUID()}`,
                        photo_id: photoId,
                        cluster_id: randomUUID(),
                        bounding_box: {
                            left: box.Left ?? 0,
                            top: box.Top ?? 0,
                            width: box.Width ?? 0,
                            height: box.Height ?? 0,
                        },
                        confidence: instance.Confidence ?? 0,
                        indexed_at: new Date().toISOString(),
                    },
                })
            );
        }
    }

    await docClient.send(
        new UpdateCommand({
            TableName: PHOTOS_TABLE,
            Key: { id: photoId },
            UpdateExpression: "SET dog_scanned_at = :now",
            ExpressionAttributeValues: { ":now": new Date().toISOString() },
        })
    );
}

// Index every face in the thumbnail into the Rekognition collection and store
// one faces-table row per face. Each new face is searched against the
// collection; when it matches an already-clustered face, it adopts that
// cluster (and its invitee assignment, if labeled) — so new uploads of known
// people surface in "Find My Photos" with no admin work. Unmatched faces
// start a singleton cluster, which shows up as unlabeled in the admin page.
async function indexAndAssignFaces(
    bucket: string,
    thumbKey: string,
    photoId: string
): Promise<void> {
    // S3 retries can re-deliver an event after a completed run. Check the
    // photo item's face_indexed_at marker with a strongly consistent read —
    // a byPhoto GSI query is eventually consistent (it could miss rows
    // written moments ago) and can't represent zero-face photos at all.
    const photo = await docClient.send(
        new GetCommand({
            TableName: PHOTOS_TABLE,
            Key: { id: photoId },
            ConsistentRead: true,
            ProjectionExpression: "face_indexed_at",
        })
    );
    if (photo.Item?.face_indexed_at) return;

    const indexed = await rekognition.send(
        new IndexFacesCommand({
            CollectionId: COLLECTION_ID,
            Image: { S3Object: { Bucket: bucket, Name: thumbKey } },
            ExternalImageId: photoId,
            QualityFilter: "AUTO",
            DetectionAttributes: ["DEFAULT"],
            MaxFaces: 15,
        })
    );

    for (const record of indexed.FaceRecords ?? []) {
        const faceId = record.Face?.FaceId;
        const box = record.Face?.BoundingBox;
        if (!faceId || !box) continue;

        const assignment = await findClusterForFace(faceId);

        await docClient.send(
            new PutCommand({
                TableName: FACES_TABLE,
                Item: {
                    face_id: faceId,
                    photo_id: photoId,
                    cluster_id: assignment?.cluster_id ?? randomUUID(),
                    invitee_id: assignment?.invitee_id,
                    invitation_id: assignment?.invitation_id,
                    ignored: assignment?.ignored,
                    bounding_box: {
                        left: box.Left ?? 0,
                        top: box.Top ?? 0,
                        width: box.Width ?? 0,
                        height: box.Height ?? 0,
                    },
                    confidence: record.Face?.Confidence ?? 0,
                    indexed_at: new Date().toISOString(),
                },
            })
        );
    }

    // Marker doubles as the backfill script's skip guard and correctly covers
    // photos with zero detected faces (no rows to find via byPhoto).
    await docClient.send(
        new UpdateCommand({
            TableName: PHOTOS_TABLE,
            Key: { id: photoId },
            UpdateExpression: "SET face_indexed_at = :now",
            ExpressionAttributeValues: { ":now": new Date().toISOString() },
        })
    );
}

// Upload-time assignment: any already-clustered match will do — an unlabeled
// cluster is still the right home for a new face of the same person.
function findClusterForFace(faceId: string): Promise<FaceAssignment | null> {
    return findMatchingRow(faceId, () => true);
}

// Look up the photo id via the byS3Key GSI and backfill the thumbnail fields.
// A missing item means the photo insert has not been written yet (the S3 event
// won the race), so back off and retry rather than silently leaving
// thumbnail_key null. Returns the photo id for the face-indexing step.
async function updatePhotoRecord(
    key: string,
    thumbKey: string,
    width: number,
    height: number,
    takenAt: string | null
): Promise<string> {
    for (let attempt = 1; attempt <= MAX_UPDATE_ATTEMPTS; attempt++) {
        const lookup = await docClient.send(
            new QueryCommand({
                TableName: PHOTOS_TABLE,
                IndexName: "byS3Key",
                KeyConditionExpression: "s3_key = :key",
                ExpressionAttributeValues: { ":key": key },
            })
        );
        const id = (lookup.Items?.[0] as { id?: string } | undefined)?.id;

        if (id) {
            await docClient.send(
                new UpdateCommand({
                    TableName: PHOTOS_TABLE,
                    Key: { id },
                    UpdateExpression:
                        "SET thumbnail_key = :thumb, width = :w, height = :h, taken_at = :taken",
                    ExpressionAttributeValues: {
                        ":thumb": thumbKey,
                        ":w": width,
                        ":h": height,
                        ":taken": takenAt,
                    },
                })
            );
            return id;
        }

        if (attempt < MAX_UPDATE_ATTEMPTS) {
            const delayMs = 250 * 2 ** (attempt - 1); // 250ms, 500ms, 1s, 2s
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }

    throw new Error(
        `No photos item found for s3_key ${key} after ${MAX_UPDATE_ATTEMPTS} attempts`
    );
}

async function streamToBuffer(stream: Readable, maxBytes: number): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        let total = 0;
        stream.on("data", (chunk: Buffer) => {
            total += chunk.length;
            if (total > maxBytes) {
                stream.destroy();
                reject(new Error(`Stream exceeds ${maxBytes} byte limit`));
                return;
            }
            chunks.push(chunk);
        });
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
}

// Parse DateTimeOriginal from raw EXIF buffer.
// EXIF DateTimeOriginal tag is 0x9003; value is ASCII "YYYY:MM:DD HH:MM:SS".
function extractDateTimeOriginal(exif: Buffer): string | null {
    try {
        // Look for the ASCII pattern that matches EXIF date format
        const str = exif.toString("binary");
        const match = str.match(/(\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2})/);
        if (!match) return null;
        // Convert "YYYY:MM:DD HH:MM:SS" → ISO 8601
        const [date, time] = match[1].split(" ");
        return `${date.replace(/:/g, "-")}T${time}`;
    } catch {
        return null;
    }
}
