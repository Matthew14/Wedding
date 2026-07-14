// Adopt professional photos that were bulk-uploaded straight into the S3
// bucket (photographer folder layout at the bucket root) into the gallery.
//
// Unlike scripts/localstack/import-photos.mjs, nothing round-trips through
// this machine: originals are server-side copied to the canonical
// uploads/original/<category>/<uuid>.<ext> layout, which triggers the
// photo-processor Lambda to generate thumbnails and backfill dimensions.
// Items are created as "pending" (invisible to the public gallery) and only
// flipped to "approved" once their thumbnail exists.
//
// Usage:
//   node scripts/import-photos-from-s3.mjs [--dry-run] [--limit N] [--folder NAME] [--approve-only]
//
//   --dry-run       list what would be imported (incl. size/extension checks)
//   --limit N       import at most N photos (smoke-testing)
//   --folder NAME   only import one top-level folder, e.g. "THE CEREMONY"
//   --approve-only  skip importing; approve pending imported photos whose
//                   thumbnails have since appeared (recovery for a crashed run)
//
// Requires: AWS credentials, S3_PHOTOS_BUCKET, DDB_PHOTOS_TABLE,
// DDB_CATEGORIES_TABLE. AWS_ENDPOINT_URL switches to LocalStack.

import { S3Client, ListObjectsV2Command, CopyObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    ScanCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";

const region = process.env.AWS_REGION ?? "eu-west-1";
const endpoint = process.env.AWS_ENDPOINT_URL;
const bucket = process.env.S3_PHOTOS_BUCKET;
const photosTable = process.env.DDB_PHOTOS_TABLE ?? "wedding-photos";
const categoriesTable = process.env.DDB_CATEGORIES_TABLE ?? "wedding-photo-categories";

if (!bucket) {
    console.error("S3_PHOTOS_BUCKET is required");
    process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const approveOnly = args.includes("--approve-only");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) : Infinity;
const folderIdx = args.indexOf("--folder");
const onlyFolder = folderIdx !== -1 ? args[folderIdx + 1] : null;

const s3 = new S3Client({ region, ...(endpoint && { endpoint, forcePathStyle: true }) });
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region, ...(endpoint && { endpoint }) }), {
    marshallOptions: { removeUndefinedValues: true },
});

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);

// The photo-processor Lambda refuses anything larger than this (it buffers
// the original into memory) — oversized files are reported, not imported.
const LAMBDA_MAX_BYTES = 25 * 1024 * 1024;

// Folder name (normalised) -> category slug, same mapping as the local import.
const FOLDER_TO_SLUG = {
    "getting ready": "getting-ready",
    "the ceremony": "the-ceremony",
    ceremony: "the-ceremony",
    cocktail: "drinks",
    drinks: "drinks",
    reception: "reception",
    party: "party",
    "r&m": "rebecca-and-matthew",
    "r and m": "rebecca-and-matthew",
};

const norm = (s) => s.trim().toLowerCase();

const CONCURRENCY = 8;
async function inBatches(items, worker) {
    const results = [];
    for (let i = 0; i < items.length; i += CONCURRENCY) {
        results.push(...(await Promise.all(items.slice(i, i + CONCURRENCY).map(worker))));
    }
    return results;
}

async function listAllObjects(prefix) {
    const objects = [];
    let token;
    do {
        const page = await s3.send(
            new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token })
        );
        objects.push(...(page.Contents ?? []));
        token = page.NextContinuationToken;
    } while (token);
    return objects;
}

// Poll until the Lambda has backfilled thumbnails, approving each photo as
// its thumbnail appears. Returns ids that never got one.
async function approveWhenProcessed(ids, timeoutMs = 10 * 60 * 1000) {
    const waiting = new Set(ids);
    const deadline = Date.now() + timeoutMs;

    while (waiting.size > 0 && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 5000));
        await inBatches([...waiting], async (id) => {
            const { Item } = await docClient.send(
                new GetCommand({ TableName: photosTable, Key: { id } })
            );
            if (Item?.thumbnail_key) {
                await docClient.send(
                    new UpdateCommand({
                        TableName: photosTable,
                        Key: { id },
                        UpdateExpression:
                            "SET #status = :approved, approved_at = :now, approved_by = :by",
                        ExpressionAttributeNames: { "#status": "status" },
                        ExpressionAttributeValues: {
                            ":approved": "approved",
                            ":now": new Date().toISOString(),
                            ":by": "import",
                        },
                    })
                );
                waiting.delete(id);
            }
        });
        console.log(`  …${ids.length - waiting.size}/${ids.length} processed & approved`);
    }
    return [...waiting];
}

// Recovery path: approve any pending imported photo (no invitation_code —
// guest uploads always have one, so they are never touched) whose thumbnail
// has appeared.
async function approvePending() {
    let approved = 0;
    let lastKey;
    do {
        const page = await docClient.send(
            new ScanCommand({
                TableName: photosTable,
                FilterExpression:
                    "#status = :pending AND attribute_exists(thumbnail_key) AND attribute_not_exists(invitation_code)",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: { ":pending": "pending" },
                ExclusiveStartKey: lastKey,
            })
        );
        for (const item of page.Items ?? []) {
            if (dryRun) {
                console.log(`would approve: ${item.file_name} (${item.id})`);
            } else {
                await docClient.send(
                    new UpdateCommand({
                        TableName: photosTable,
                        Key: { id: item.id },
                        UpdateExpression:
                            "SET #status = :approved, approved_at = :now, approved_by = :by",
                        ExpressionAttributeNames: { "#status": "status" },
                        ExpressionAttributeValues: {
                            ":approved": "approved",
                            ":now": new Date().toISOString(),
                            ":by": "import",
                        },
                    })
                );
            }
            approved++;
        }
        lastKey = page.LastEvaluatedKey;
    } while (lastKey);
    console.log(`${dryRun ? "would approve" : "approved"} ${approved} pending imported photos`);
}

if (approveOnly) {
    await approvePending();
    process.exit(0);
}

// Category slug -> id.
const catScan = await docClient.send(new ScanCommand({ TableName: categoriesTable }));
const slugToId = Object.fromEntries((catScan.Items ?? []).map((c) => [c.slug, c.id]));

// Skip-detection: file_name + category of everything already in the table.
const photoScan = await docClient.send(new ScanCommand({ TableName: photosTable }));
const alreadyImported = new Set(
    (photoScan.Items ?? []).map((p) => `${p.file_name}::${p.category_id ?? ""}`)
);

// Discover top-level photographer folders (everything except uploads/).
const top = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Delimiter: "/" }));
const folders = (top.CommonPrefixes ?? [])
    .map((p) => p.Prefix.replace(/\/$/, ""))
    .filter((name) => name !== "uploads")
    .filter((name) => !onlyFolder || norm(name) === norm(onlyFolder));

if (folders.length === 0) {
    console.error("No matching photographer folders found at the bucket root");
    process.exit(1);
}

let planned = 0;
let skipped = 0;
const oversized = [];
const unsupported = [];
const toImport = [];

for (const folder of folders) {
    const slug = FOLDER_TO_SLUG[norm(folder)];
    const categoryId = slug ? slugToId[slug] : null;
    if (!slug) console.warn(`! folder "${folder}" has no category mapping — importing uncategorised`);
    else if (!categoryId) console.warn(`! folder "${folder}" maps to "${slug}" but no such category — importing uncategorised`);

    const objects = await listAllObjects(`${folder}/`);
    const files = objects.filter((o) => o.Size > 0 && !o.Key.endsWith("/"));
    console.log(`# ${folder} (${files.length} files${slug ? ` → ${slug}` : ""})`);

    for (const obj of files) {
        if (planned >= limit) break;
        const fileName = basename(obj.Key);
        const ext = extname(fileName).toLowerCase();

        if (!IMAGE_EXTS.has(ext)) {
            unsupported.push(obj.Key);
            continue;
        }
        if (obj.Size > LAMBDA_MAX_BYTES) {
            oversized.push(`${obj.Key} (${(obj.Size / 1e6).toFixed(1)} MB)`);
            continue;
        }
        if (alreadyImported.has(`${fileName}::${categoryId ?? ""}`)) {
            skipped++;
            continue;
        }

        toImport.push({ sourceKey: obj.Key, fileName, ext, sizeBytes: obj.Size, categoryId, slug });
        planned++;
    }
}

console.log(
    `\nplan: ${toImport.length} to import, ${skipped} already imported, ` +
        `${oversized.length} over the ${LAMBDA_MAX_BYTES / 1e6} MB Lambda limit, ` +
        `${unsupported.length} unsupported files`
);
for (const o of oversized) console.log(`  OVERSIZED (handle separately): ${o}`);
for (const u of unsupported) console.log(`  UNSUPPORTED (ignored): ${u}`);

if (dryRun) {
    for (const f of toImport.slice(0, 20)) {
        console.log(`  would import: ${f.sourceKey} → uploads/original/${f.slug ?? "uncategorised"}/<uuid>${f.ext}`);
    }
    if (toImport.length > 20) console.log(`  … and ${toImport.length - 20} more`);
    process.exit(0);
}

let copied = 0;
let failed = 0;
const importedIds = [];

await inBatches(toImport, async (f) => {
    const uuid = randomUUID();
    const destKey = `uploads/original/${f.slug ?? "uncategorised"}/${uuid}${f.ext}`;
    try {
        // Item first so the Lambda's byS3Key lookup finds it immediately.
        // invitation_code is omitted entirely (byCode GSI key attribute).
        await docClient.send(
            new PutCommand({
                TableName: photosTable,
                Item: {
                    id: uuid,
                    s3_key: destKey,
                    thumbnail_key: null,
                    file_name: f.fileName,
                    width: null,
                    height: null,
                    size_bytes: f.sizeBytes,
                    taken_at: null,
                    category_id: f.categoryId,
                    status: "pending",
                    uploaded_at: new Date().toISOString(),
                    approved_at: null,
                    approved_by: null,
                },
            })
        );
        await s3.send(
            new CopyObjectCommand({
                Bucket: bucket,
                Key: destKey,
                CopySource: encodeURIComponent(`${bucket}/${f.sourceKey}`).replace(/%2F/g, "/"),
            })
        );
        importedIds.push(uuid);
        copied++;
        if (copied % 25 === 0) console.log(`  …${copied}/${toImport.length} copied`);
    } catch (err) {
        failed++;
        console.error(`FAILED ${f.sourceKey}: ${err.message}`);
    }
});

console.log(`\ncopied ${copied}, failed ${failed}. Waiting for thumbnails…`);

if (importedIds.length > 0) {
    const unprocessed = await approveWhenProcessed(importedIds);
    if (unprocessed.length > 0) {
        console.warn(
            `\n${unprocessed.length} photos never got a thumbnail (still pending, not public). ` +
                `Check the photo-processor Lambda logs, then re-run with --approve-only.`
        );
        process.exit(1);
    }
}

console.log("\nDone. All imported photos are processed and approved.");
