// Local stand-in for the `photo-processor` Lambda.
//
// The real Lambda is triggered by S3 ObjectCreated on uploads/original/. Wiring
// that trigger (plus a sharp arm64 build) into LocalStack is fiddly, so for local
// dev we run the same logic on demand: find photos with no thumbnail yet, generate
// a 1200px JPEG thumbnail (EXIF stripped), upload it, and backfill the DB row.
//
// Run via: npm run localstack:process  (loads .env.localstack)

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import sharp from "sharp";

const region = process.env.AWS_REGION ?? "eu-west-1";
const endpoint = process.env.AWS_ENDPOINT_URL;
const bucket = process.env.S3_PHOTOS_BUCKET;
const resourceArn = process.env.AURORA_CLUSTER_ARN;
const secretArn = process.env.AURORA_SECRET_ARN;
const database = process.env.DB_NAME ?? "wedding";

const s3 = new S3Client({ region, endpoint, forcePathStyle: true });
const rds = new RDSDataClient({ region, endpoint });

async function exec(sql, parameters = []) {
    const res = await rds.send(
        new ExecuteStatementCommand({ resourceArn, secretArn, database, sql, parameters, formatRecordsAs: "JSON" })
    );
    return res.formattedRecords ? JSON.parse(res.formattedRecords) : [];
}

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

const pending = await exec(
    "SELECT id, s3_key FROM photos WHERE thumbnail_key IS NULL ORDER BY uploaded_at"
);

if (pending.length === 0) {
    console.log("No unprocessed photos.");
    process.exit(0);
}

for (const { id, s3_key: key } of pending) {
    try {
        const parts = key.split("/"); // uploads/original/{code}/{uuid}.ext
        const code = parts[2];
        const uuid = parts[3].substring(0, parts[3].lastIndexOf("."));
        const thumbKey = `uploads/thumbnail/${code}/${uuid}.jpg`;

        const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const buffer = await streamToBuffer(obj.Body);

        const { data, info } = await sharp(buffer)
            .rotate()
            .withMetadata(false) // strip EXIF
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer({ resolveWithObject: true });

        await s3.send(
            new PutObjectCommand({ Bucket: bucket, Key: thumbKey, Body: data, ContentType: "image/jpeg" })
        );

        await exec(
            "UPDATE photos SET thumbnail_key = :thumb, width = :w, height = :h WHERE id = :id",
            [
                { name: "thumb", value: { stringValue: thumbKey } },
                { name: "w", value: { longValue: info.width } },
                { name: "h", value: { longValue: info.height } },
                { name: "id", value: { stringValue: id } },
            ]
        );
        console.log(`✓ processed ${key} → ${thumbKey}`);
    } catch (err) {
        console.error(`✗ failed ${key}:`, err.message);
    }
}
