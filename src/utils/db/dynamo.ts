import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const lambdaKeyId = process.env["LAMBDA_AWS_KEY_ID"];
const lambdaSecret = process.env["LAMBDA_AWS_SECRET"];

// AWS_ENDPOINT_URL points the DynamoDB client at LocalStack in local dev.
const endpoint = process.env["AWS_ENDPOINT_URL"];

const client = new DynamoDBClient({
    region: process.env["AWS_REGION"] ?? "eu-west-1",
    ...(endpoint && { endpoint }),
    ...(lambdaKeyId && lambdaSecret && {
        credentials: {
            accessKeyId: lambdaKeyId,
            secretAccessKey: lambdaSecret,
        },
    }),
});

// Item attributes keep the snake_case names of the old Postgres columns so
// the API response shapes (and the types in src/types/) are unchanged.
export const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
});

export const ARCHIVE_TABLE = process.env["DDB_ARCHIVE_TABLE"] ?? "wedding-archive";
export const PHOTOS_TABLE = process.env["DDB_PHOTOS_TABLE"] ?? "wedding-photos";
export const CATEGORIES_TABLE = process.env["DDB_CATEGORIES_TABLE"] ?? "wedding-photo-categories";
