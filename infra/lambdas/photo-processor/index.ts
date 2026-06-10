import type { S3Event } from "aws-lambda";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import type { Readable } from "stream";

const s3 = new S3Client({});
const rds = new RDSDataClient({});

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
    const buffer = await streamToBuffer(obj.Body as Readable);

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

    await rds.send(
        new ExecuteStatementCommand({
            resourceArn: process.env.AURORA_CLUSTER_ARN!,
            secretArn: process.env.AURORA_SECRET_ARN!,
            database: process.env.DB_NAME ?? "wedding",
            sql: `UPDATE photos
                  SET thumbnail_key = :thumb,
                      width = :w,
                      height = :h,
                      taken_at = :taken
                  WHERE s3_key = :key`,
            parameters: [
                { name: "thumb", value: { stringValue: thumbKey } },
                { name: "w", value: { longValue: info.width } },
                { name: "h", value: { longValue: info.height } },
                { name: "taken", value: takenAt ? { stringValue: takenAt } : { isNull: true } },
                { name: "key", value: { stringValue: key } },
            ],
        })
    );
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
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
