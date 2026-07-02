// Bulk-import a directory of photos into the local gallery (LocalStack).
//
// Expects a directory whose subfolders are the photographer's categories, e.g.
//   photos/
//     GETTING READY/  THE CEREMONY/  COCKTAIL/  RECEPTION/  PARTY/  R&M/
//
// For each image it uploads the original to S3, generates a 1200px thumbnail
// (EXIF stripped), and inserts an APPROVED photos row mapped to the matching
// category. Re-running skips files already imported (by file_name + category).
//
// Usage: npm run localstack:import -- /path/to/photos
//        npm run localstack:import -- /path/to/photos "GETTING READY"   # one folder

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import sharp from "sharp";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";

const region = process.env.AWS_REGION ?? "eu-west-1";
const endpoint = process.env.AWS_ENDPOINT_URL;
const bucket = process.env.S3_PHOTOS_BUCKET;
const resourceArn = process.env.AURORA_CLUSTER_ARN;
const secretArn = process.env.AURORA_SECRET_ARN;
const database = process.env.DB_NAME ?? "wedding";

const rootDir = process.argv[2];
const onlyFolder = process.argv[3]; // optional: import a single subfolder
if (!rootDir) {
    console.error("Usage: npm run localstack:import -- /path/to/photos [\"SUBFOLDER\"]");
    process.exit(1);
}

const s3 = new S3Client({ region, endpoint, forcePathStyle: true });
const rds = new RDSDataClient({ region, endpoint });

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".heic"]);

// Folder name (normalised) -> category slug seeded by bootstrap.
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

async function exec(sql, parameters = []) {
    const res = await rds.send(
        new ExecuteStatementCommand({ resourceArn, secretArn, database, sql, parameters, formatRecordsAs: "JSON", includeResultMetadata: true })
    );
    if (res.formattedRecords) return JSON.parse(res.formattedRecords);
    if (res.records) {
        const names = (res.columnMetadata ?? []).map((c) => c.name);
        const val = (f) => (f.isNull ? null : f.stringValue ?? f.longValue ?? null);
        return res.records.map((r) => Object.fromEntries(r.map((f, i) => [names[i], val(f)])));
    }
    return [];
}

// EXIF DateTimeOriginal -> ISO 8601 (best-effort, same heuristic as the Lambda).
function extractTakenAt(exif) {
    if (!exif) return null;
    const m = exif.toString("binary").match(/(\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2})/);
    if (!m) return null;
    const [date, time] = m[1].split(" ");
    return `${date.replace(/:/g, "-")}T${time}`;
}

// Resolve category slug -> id (null for unmapped folders).
const cats = await exec("SELECT id, slug FROM photo_categories");
const slugToId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

const entries = await readdir(rootDir, { withFileTypes: true });
const folders = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !onlyFolder || norm(name) === norm(onlyFolder));

let imported = 0;
let skipped = 0;
let failed = 0;

for (const folder of folders) {
    const slug = FOLDER_TO_SLUG[norm(folder)];
    const categoryId = slug ? slugToId[slug] : null;
    if (slug && !categoryId) {
        console.warn(`! folder "${folder}" maps to slug "${slug}" but no such category — importing uncategorised`);
    } else if (!slug) {
        console.warn(`! folder "${folder}" has no category mapping — importing uncategorised`);
    }

    const files = (await readdir(join(rootDir, folder))).filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()));
    console.log(`\n# ${folder} (${files.length} images${slug ? ` → ${slug}` : ""})`);

    for (const file of files) {
        const filePath = join(rootDir, folder, file);
        try {
            // skip if already imported into this category
            const existing = await exec(
                "SELECT id FROM photos WHERE file_name = :fn AND category_id IS NOT DISTINCT FROM :cid",
                [
                    { name: "fn", value: { stringValue: file } },
                    { name: "cid", value: categoryId ? { stringValue: categoryId } : { isNull: true } },
                ]
            );
            if (existing.length > 0) { skipped++; continue; }

            const buffer = await readFile(filePath);
            const sizeBytes = (await stat(filePath)).size;
            const uuid = randomUUID();
            const ext = extname(file).toLowerCase().replace(".", "") || "jpg";
            const slugSeg = slug ?? "uncategorised";
            const key = `uploads/original/${slugSeg}/${uuid}.${ext}`;
            const thumbKey = `uploads/thumbnail/${slugSeg}/${uuid}.jpg`;

            // original
            await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer }));

            // thumbnail (EXIF stripped) + dimensions + taken_at
            const meta = await sharp(buffer).metadata();
            const takenAt = extractTakenAt(meta.exif);
            const { data, info } = await sharp(buffer)
                .rotate()
                .withMetadata(false)
                .resize({ width: 1200, withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer({ resolveWithObject: true });
            await s3.send(new PutObjectCommand({ Bucket: bucket, Key: thumbKey, Body: data, ContentType: "image/jpeg" }));

            await exec(
                `INSERT INTO photos (invitation_code, s3_key, thumbnail_key, file_name, width, height, size_bytes, taken_at, category_id, status, approved_at, approved_by)
                 VALUES (NULL, :key, :thumb, :fn, :w, :h, :size, :taken, :cid, 'approved', NOW(), 'import')`,
                [
                    { name: "key", value: { stringValue: key } },
                    { name: "thumb", value: { stringValue: thumbKey } },
                    { name: "fn", value: { stringValue: file } },
                    { name: "w", value: { longValue: info.width } },
                    { name: "h", value: { longValue: info.height } },
                    { name: "size", value: { longValue: sizeBytes } },
                    { name: "taken", value: takenAt ? { stringValue: takenAt } : { isNull: true } },
                    { name: "cid", value: categoryId ? { stringValue: categoryId } : { isNull: true } },
                ]
            );
            imported++;
            if (imported % 25 === 0) console.log(`  …${imported} imported`);
        } catch (err) {
            failed++;
            console.error(`  ✗ ${basename(filePath)}: ${err.message}`);
        }
    }
}

console.log(`\n✅ done — imported ${imported}, skipped ${skipped} (already present), failed ${failed}`);
