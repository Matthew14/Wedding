// Local stand-in for the `photo-processor` Lambda.
//
// The real Lambda is triggered by S3 ObjectCreated on uploads/original/. Wiring
// that trigger (plus a sharp arm64 build) into LocalStack is fiddly, so for local
// dev we run the same logic on demand: find photos with no thumbnail yet, generate
// a 1200px JPEG thumbnail (EXIF stripped), upload it, and backfill the item.
//
// Run via: npm run localstack:process  (loads .env.localstack)

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import sharp from "sharp";

const region = process.env.AWS_REGION ?? "eu-west-1";
const endpoint = process.env.AWS_ENDPOINT_URL;
const bucket = process.env.S3_PHOTOS_BUCKET;
const photosTable = process.env.DDB_PHOTOS_TABLE ?? "wedding-photos";

const s3 = new S3Client({ region, endpoint, forcePathStyle: true });
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region, endpoint }));

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

// Tiny local dataset — scan everything and filter in code.
const scan = await docClient.send(new ScanCommand({ TableName: photosTable }));
const pending = (scan.Items ?? [])
    .filter((p) => p.thumbnail_key == null)
    .sort((a, b) => (a.uploaded_at < b.uploaded_at ? -1 : 1));

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

        await docClient.send(
            new UpdateCommand({
                TableName: photosTable,
                Key: { id },
                UpdateExpression: "SET thumbnail_key = :thumb, width = :w, height = :h",
                ExpressionAttributeValues: { ":thumb": thumbKey, ":w": info.width, ":h": info.height },
            })
        );
        console.log(`✓ processed ${key} → ${thumbKey}`);
    } catch (err) {
        console.error(`✗ failed ${key}:`, err.message);
    }
}
