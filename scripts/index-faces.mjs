// Backfill face detection for the photo gallery ("Find My Photos").
//
// Phase A (index): every photo with a thumbnail and no face_indexed_at marker
// has its faces indexed into the Rekognition collection, one faces-table row
// per detected face. Thumbnails (1200px JPEGs) are used instead of originals —
// some originals exceed Rekognition's 15 MB S3 limit.
//
// Phase B (cluster): every face is searched against the collection
// (SearchFaces by FaceId) and similar faces are grouped with union-find; each
// group gets a fresh cluster_id. The admin dashboard then labels clusters
// with invitee names. The threshold errs high on purpose: a person split
// across two clusters is cheap (assign both to the same guest), a cluster
// mixing two people is not.
//
// Usage:
//   node scripts/index-faces.mjs [--dry-run] [--limit N] [--index-only]
//                                [--cluster-only] [--threshold N] [--force]
//
//   --dry-run       report what each phase would do without calling AWS mutators
//   --limit N       index at most N photos (smoke-testing)
//   --index-only    run Phase A only
//   --cluster-only  run Phase B only (e.g. after re-tuning --threshold)
//   --threshold N   SearchFaces similarity threshold, default 95
//   --force         allow re-clustering even after labeling has started
//
// Both phases are idempotent: Phase A skips photos with face_indexed_at,
// Phase B recomputes every cluster from scratch (which is why it refuses to
// run once labels exist, unless --force).
//
// Requires: AWS credentials (run with AWS_PROFILE=wedding), S3_PHOTOS_BUCKET,
// DDB_PHOTOS_TABLE, DDB_FACES_TABLE. AWS_ENDPOINT_URL switches DynamoDB/S3 to
// LocalStack, but Rekognition has no LocalStack analogue — this script is
// prod-only in practice.

import {
    RekognitionClient,
    IndexFacesCommand,
    SearchFacesCommand,
} from "@aws-sdk/client-rekognition";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    ScanCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";

const region = process.env.AWS_REGION ?? "eu-west-1";
const endpoint = process.env.AWS_ENDPOINT_URL;
const bucket = process.env.S3_PHOTOS_BUCKET;
const photosTable = process.env.DDB_PHOTOS_TABLE ?? "wedding-photos";
const facesTable = process.env.DDB_FACES_TABLE ?? "wedding-photo-faces";
const collectionId = process.env.REKOGNITION_COLLECTION_ID ?? "wedding-faces-2026";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const indexOnly = args.includes("--index-only");
const clusterOnly = args.includes("--cluster-only");
const force = args.includes("--force");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) : Infinity;
const thresholdIdx = args.indexOf("--threshold");
const threshold = thresholdIdx !== -1 ? Number(args[thresholdIdx + 1]) : 95;

if (!bucket && !clusterOnly) {
    console.error("S3_PHOTOS_BUCKET is required");
    process.exit(1);
}
if (indexOnly && clusterOnly) {
    console.error("--index-only and --cluster-only are mutually exclusive");
    process.exit(1);
}

const rekognition = new RekognitionClient({ region });
const docClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region, ...(endpoint && { endpoint }) }),
    { marshallOptions: { removeUndefinedValues: true } }
);

const CONCURRENCY = 3;
async function inBatches(items, worker) {
    const results = [];
    for (let i = 0; i < items.length; i += CONCURRENCY) {
        results.push(...(await Promise.all(items.slice(i, i + CONCURRENCY).map(worker))));
    }
    return results;
}

// Retry throttling-ish errors with exponential backoff; rethrow anything else.
async function withRetry(fn, label) {
    for (let attempt = 1; ; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const retryable =
                err.name === "ThrottlingException" ||
                err.name === "ProvisionedThroughputExceededException" ||
                err.$metadata?.httpStatusCode === 429;
            if (!retryable || attempt >= 5) throw err;
            const delayMs = 500 * 2 ** (attempt - 1);
            console.warn(`  throttled on ${label}, retrying in ${delayMs}ms`);
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
}

async function scanAll(tableName, extra = {}) {
    const items = [];
    let lastKey;
    do {
        const page = await docClient.send(
            new ScanCommand({ TableName: tableName, ExclusiveStartKey: lastKey, ...extra })
        );
        items.push(...(page.Items ?? []));
        lastKey = page.LastEvaluatedKey;
    } while (lastKey);
    return items;
}

// ── Phase A: index faces ────────────────────────────────────────────────────

async function indexPhotos() {
    const photos = await scanAll(photosTable);
    const noThumbnail = photos.filter((p) => !p.thumbnail_key);
    const done = photos.filter((p) => p.thumbnail_key && p.face_indexed_at);
    const todo = photos
        .filter((p) => p.thumbnail_key && !p.face_indexed_at)
        .slice(0, limit);

    console.log(
        `Phase A: ${todo.length} photos to index ` +
            `(${done.length} already indexed, ${noThumbnail.length} without thumbnails skipped)`
    );
    if (dryRun) {
        for (const p of todo.slice(0, 20)) console.log(`  would index: ${p.thumbnail_key}`);
        if (todo.length > 20) console.log(`  … and ${todo.length - 20} more`);
        return;
    }

    let indexed = 0;
    let faces = 0;
    let failed = 0;

    await inBatches(todo, async (photo) => {
        try {
            const result = await withRetry(
                () =>
                    rekognition.send(
                        new IndexFacesCommand({
                            CollectionId: collectionId,
                            Image: { S3Object: { Bucket: bucket, Name: photo.thumbnail_key } },
                            ExternalImageId: photo.id,
                            QualityFilter: "AUTO",
                            DetectionAttributes: ["DEFAULT"],
                            MaxFaces: 15,
                        })
                    ),
                photo.thumbnail_key
            );

            for (const record of result.FaceRecords ?? []) {
                const face = record.Face;
                if (!face?.FaceId || !face.BoundingBox) continue;
                await docClient.send(
                    new PutCommand({
                        TableName: facesTable,
                        Item: {
                            face_id: face.FaceId,
                            photo_id: photo.id,
                            bounding_box: {
                                left: face.BoundingBox.Left ?? 0,
                                top: face.BoundingBox.Top ?? 0,
                                width: face.BoundingBox.Width ?? 0,
                                height: face.BoundingBox.Height ?? 0,
                            },
                            confidence: face.Confidence ?? 0,
                            indexed_at: new Date().toISOString(),
                        },
                    })
                );
                faces++;
            }

            await docClient.send(
                new UpdateCommand({
                    TableName: photosTable,
                    Key: { id: photo.id },
                    UpdateExpression: "SET face_indexed_at = :now",
                    ExpressionAttributeValues: { ":now": new Date().toISOString() },
                })
            );

            indexed++;
            if (indexed % 25 === 0) console.log(`  …${indexed}/${todo.length} photos indexed`);
        } catch (err) {
            failed++;
            console.error(`FAILED ${photo.thumbnail_key}: ${err.message}`);
        }
    });

    console.log(`Phase A done: ${indexed} photos indexed, ${faces} faces found, ${failed} failed`);
    if (failed > 0) {
        console.warn("Failed photos keep no face_indexed_at marker — re-run to retry them.");
    }
}

// ── Phase B: cluster faces ──────────────────────────────────────────────────

async function clusterFaces() {
    const faces = await scanAll(facesTable);
    if (faces.length === 0) {
        console.log("Phase B: no faces to cluster");
        return;
    }

    const labeled = faces.filter((f) => f.invitee_id != null || f.ignored);
    if (labeled.length > 0 && !force) {
        console.error(
            `Phase B refused: ${labeled.length} faces already carry labels. ` +
                `Re-clustering replaces every cluster_id and orphans that work. ` +
                `Run with --force if you really want this.`
        );
        process.exit(1);
    }

    console.log(
        `Phase B: clustering ${faces.length} faces at threshold ${threshold}` +
            (dryRun ? " (dry-run: no SearchFaces calls, no writes)" : "")
    );
    if (dryRun) return;

    // Union-find over face ids, fed by SearchFaces matches.
    const parent = new Map(faces.map((f) => [f.face_id, f.face_id]));
    const find = (id) => {
        let root = id;
        while (parent.get(root) !== root) root = parent.get(root);
        while (parent.get(id) !== root) {
            const next = parent.get(id);
            parent.set(id, root);
            id = next;
        }
        return root;
    };
    const union = (a, b) => parent.set(find(a), find(b));

    let searched = 0;
    await inBatches(faces, async (face) => {
        const result = await withRetry(
            () =>
                rekognition.send(
                    new SearchFacesCommand({
                        CollectionId: collectionId,
                        FaceId: face.face_id,
                        FaceMatchThreshold: threshold,
                        MaxFaces: 50,
                    })
                ),
            face.face_id
        );
        for (const match of result.FaceMatches ?? []) {
            // The collection can hold faces whose rows were deleted; only
            // union faces we actually track.
            if (match.Face?.FaceId && parent.has(match.Face.FaceId)) {
                union(face.face_id, match.Face.FaceId);
            }
        }
        searched++;
        if (searched % 100 === 0) console.log(`  …${searched}/${faces.length} faces searched`);
    });

    const clusterIds = new Map(); // root face_id -> cluster uuid
    for (const face of faces) {
        const root = find(face.face_id);
        if (!clusterIds.has(root)) clusterIds.set(root, randomUUID());
    }

    let updated = 0;
    await inBatches(faces, async (face) => {
        await docClient.send(
            new UpdateCommand({
                TableName: facesTable,
                Key: { face_id: face.face_id },
                UpdateExpression: "SET cluster_id = :cluster",
                ExpressionAttributeValues: { ":cluster": clusterIds.get(find(face.face_id)) },
            })
        );
        updated++;
        if (updated % 200 === 0) console.log(`  …${updated}/${faces.length} rows updated`);
    });

    const sizes = [...clusterIds.keys()].map(
        (root) => faces.filter((f) => find(f.face_id) === root).length
    );
    const singletons = sizes.filter((s) => s === 1).length;
    console.log(
        `Phase B done: ${clusterIds.size} clusters over ${faces.length} faces ` +
            `(${singletons} singletons, largest ${Math.max(...sizes)})`
    );
    console.log(
        "Spot-check the biggest clusters before labeling — a cluster mixing two " +
            "people means the threshold is too low; re-run with --cluster-only --threshold 97."
    );
}

if (!clusterOnly) await indexPhotos();
if (!indexOnly) await clusterFaces();
console.log("Done.");
