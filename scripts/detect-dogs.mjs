// Backfill dog detection so Maggie appears in the gallery's people search.
//
// Runs Rekognition DetectLabels (filtered to "Dog") over every photo
// thumbnail and stores one faces-table row per detected dog, all under the
// single shared cluster "dog-detections". The admin then assigns that
// cluster to Maggie in the dashboard and rejects the dogs that aren't her
// via the By Person tab (other dogs attended the wedding). Once assigned,
// she shows up in the guest-facing people search like any labeled person.
//
// Usage:
//   node scripts/detect-dogs.mjs [--dry-run] [--limit N] [--min-confidence N]
//
//   --dry-run           list what would be scanned, no AWS mutations
//   --limit N           scan at most N photos (smoke-testing)
//   --min-confidence N  DetectLabels MinConfidence, default 70
//
// Idempotent: photos with a dog_scanned_at marker are skipped, so a crashed
// run can simply be re-run. Cost: ~$0.001/photo (~$0.75 for the full set).
//
// Caveat: the to-do list is snapshotted up front, so a photo uploaded (and
// Lambda-scanned) mid-run can be scanned twice, leaving duplicate dog rows —
// harmless, just extra cards to prune. Avoid re-running while uploads are hot.
//
// Requires: AWS credentials (run with AWS_PROFILE=wedding), S3_PHOTOS_BUCKET,
// DDB_PHOTOS_TABLE, DDB_FACES_TABLE.

import { RekognitionClient, DetectLabelsCommand } from "@aws-sdk/client-rekognition";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    ScanCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";

const region = process.env.AWS_REGION ?? "eu-west-1";
const bucket = process.env.S3_PHOTOS_BUCKET;
const photosTable = process.env.DDB_PHOTOS_TABLE ?? "wedding-photos";
const facesTable = process.env.DDB_FACES_TABLE ?? "wedding-photo-faces";

// One shared cluster so the whole backfill shows as a single card the admin
// assigns to Maggie once, then prunes.
const DOG_CLUSTER_ID = "dog-detections";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) : Infinity;
const confIdx = args.indexOf("--min-confidence");
const minConfidence = confIdx !== -1 ? Number(args[confIdx + 1]) : 70;

if (!bucket) {
    console.error("S3_PHOTOS_BUCKET is required");
    process.exit(1);
}

const rekognition = new RekognitionClient({ region });
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
});

const CONCURRENCY = 3;
async function inBatches(items, worker) {
    for (let i = 0; i < items.length; i += CONCURRENCY) {
        await Promise.all(items.slice(i, i + CONCURRENCY).map(worker));
    }
}

const photos = [];
let lastKey;
do {
    const page = await docClient.send(
        new ScanCommand({ TableName: photosTable, ExclusiveStartKey: lastKey })
    );
    photos.push(...(page.Items ?? []));
    lastKey = page.LastEvaluatedKey;
} while (lastKey);

const todo = photos.filter((p) => p.thumbnail_key && !p.dog_scanned_at).slice(0, limit);
const done = photos.filter((p) => p.thumbnail_key && p.dog_scanned_at).length;
console.log(`${todo.length} photos to scan for dogs (${done} already scanned)`);

if (dryRun) {
    for (const p of todo.slice(0, 10)) console.log(`  would scan: ${p.thumbnail_key}`);
    if (todo.length > 10) console.log(`  … and ${todo.length - 10} more`);
    process.exit(0);
}

let scanned = 0;
let dogs = 0;
let failed = 0;

await inBatches(todo, async (photo) => {
    try {
        const result = await rekognition.send(
            new DetectLabelsCommand({
                Image: { S3Object: { Bucket: bucket, Name: photo.thumbnail_key } },
                Features: ["GENERAL_LABELS"],
                Settings: { GeneralLabels: { LabelInclusionFilters: ["Dog"] } },
                MinConfidence: minConfidence,
            })
        );

        for (const label of result.Labels ?? []) {
            for (const instance of label.Instances ?? []) {
                if (!instance.BoundingBox) continue;
                await docClient.send(
                    new PutCommand({
                        TableName: facesTable,
                        Item: {
                            face_id: `dog-${randomUUID()}`,
                            photo_id: photo.id,
                            cluster_id: DOG_CLUSTER_ID,
                            bounding_box: {
                                left: instance.BoundingBox.Left ?? 0,
                                top: instance.BoundingBox.Top ?? 0,
                                width: instance.BoundingBox.Width ?? 0,
                                height: instance.BoundingBox.Height ?? 0,
                            },
                            confidence: instance.Confidence ?? 0,
                            indexed_at: new Date().toISOString(),
                        },
                    })
                );
                dogs++;
            }
        }

        await docClient.send(
            new UpdateCommand({
                TableName: photosTable,
                Key: { id: photo.id },
                UpdateExpression: "SET dog_scanned_at = :now",
                ExpressionAttributeValues: { ":now": new Date().toISOString() },
            })
        );

        scanned++;
        if (scanned % 50 === 0) console.log(`  …${scanned}/${todo.length} scanned, ${dogs} dogs so far`);
    } catch (err) {
        failed++;
        console.error(`FAILED ${photo.thumbnail_key}: ${err.message}`);
    }
});

console.log(
    `Done: ${scanned} photos scanned, ${dogs} dog detections in cluster "${DOG_CLUSTER_ID}", ${failed} failed`
);
if (dogs > 0) {
    console.log("Next: assign the dog cluster to Maggie in the dashboard, then prune via By Person.");
}
