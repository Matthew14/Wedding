import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
    region: process.env["AWS_REGION"] ?? "eu-west-1",
    ...(process.env["LAMBDA_AWS_KEY_ID"] && process.env["LAMBDA_AWS_SECRET"] && {
        credentials: {
            accessKeyId: process.env["LAMBDA_AWS_KEY_ID"],
            secretAccessKey: process.env["LAMBDA_AWS_SECRET"],
        },
    }),
});

export function getS3() {
    return s3;
}

export const BUCKET = process.env["S3_PHOTOS_BUCKET"] ?? "";

export function cdnUrl(key: string) {
    return `${process.env["NEXT_PUBLIC_CLOUDFRONT_URL"]}/${key}`;
}
