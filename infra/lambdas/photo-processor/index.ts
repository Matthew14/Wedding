import type { S3Event } from "aws-lambda";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Readable } from "stream";

const s3 = new S3Client({});
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const PHOTOS_TABLE = process.env.PHOTOS_TABLE ?? "wedding-photos";

// Upper bound on the original file we will buffer into memory, so a single
// oversized object cannot OOM-crash the function. Guest uploads are capped at
// 20 MB by the upload-url API; the margin above that exists for bulk-imported
// professional photos, which ran up to ~28 MB.
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

// The S3 OBJECT_CREATED event can race ahead of the API route's photo insert,
// in which case the byS3Key lookup below finds nothing. Retry a few times with
// exponential backoff before giving up.
const MAX_UPDATE_ATTEMPTS = 5;

export async function handler(event: S3Event): Promise<void> {
    for (const record of event.Records) {
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
        try {
            await processPhoto(key, record.s3.bucket.name);
        } catch (err) {
            // graceful degradation: thumbnail_key stays null
            console.error(`Failed to process ${key}:`, err);
        }
    }
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
    const buffer = await streamToBuffer(obj.Body as Readable, MAX_IMAGE_BYTES);

    const image = sharp(buffer).rotate(); // auto-rotate using EXIF orientation
    const metadata = await image.metadata();
    const takenAt = metadata.exif ? extractDateTimeOriginal(metadata.exif) : null;

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

    await updatePhotoRecord(key, thumbKey, info.width, info.height, takenAt);
}

// Look up the photo id via the byS3Key GSI and backfill the thumbnail fields.
// A missing item means the photo insert has not been written yet (the S3 event
// won the race), so back off and retry rather than silently leaving
// thumbnail_key null.
async function updatePhotoRecord(
    key: string,
    thumbKey: string,
    width: number,
    height: number,
    takenAt: string | null
): Promise<void> {
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
            return;
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
