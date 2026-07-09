import {
    GetCommand,
    PutCommand,
    QueryCommand,
    UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";
import { docClient, PHOTOS_TABLE } from "./dynamo";
import type { Photo } from "@/types/photos";

export interface CreatePhotoInput {
    invitation_code: string;
    s3_key: string;
    file_name: string;
    size_bytes: number;
    category_id: string | null;
}

export async function createPhoto(input: CreatePhotoInput): Promise<Photo> {
    const photo: Photo = {
        id: randomUUID(),
        invitation_code: input.invitation_code,
        s3_key: input.s3_key,
        thumbnail_key: null,
        file_name: input.file_name,
        width: null,
        height: null,
        size_bytes: input.size_bytes,
        taken_at: null,
        category_id: input.category_id,
        status: "pending",
        uploaded_at: new Date().toISOString(),
        approved_at: null,
        approved_by: null,
    };
    await docClient.send(new PutCommand({ TableName: PHOTOS_TABLE, Item: photo }));
    return photo;
}

export async function getPhotoById(id: string): Promise<Photo | null> {
    const result = await docClient.send(
        new GetCommand({ TableName: PHOTOS_TABLE, Key: { id } })
    );
    return (result.Item as Photo | undefined) ?? null;
}

// Count of a code's uploads since the given ISO timestamp (rate limiting).
export async function countUploadsSince(code: string, sinceIso: string): Promise<number> {
    const result = await docClient.send(
        new QueryCommand({
            TableName: PHOTOS_TABLE,
            IndexName: "byCode",
            KeyConditionExpression: "invitation_code = :code AND uploaded_at > :since",
            ExpressionAttributeValues: { ":code": code, ":since": sinceIso },
            Select: "COUNT",
        })
    );
    return result.Count ?? 0;
}

// All photos with the given status, newest first. The full status partition is
// read (paginating under the hood) — the collection is a few hundred photos at
// most, and callers need the total count for pagination metadata anyway.
export async function listPhotosByStatus(status: Photo["status"]): Promise<Photo[]> {
    const photos: Photo[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
        const result = await docClient.send(
            new QueryCommand({
                TableName: PHOTOS_TABLE,
                IndexName: "byStatus",
                KeyConditionExpression: "#status = :status",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: { ":status": status },
                ScanIndexForward: false, // uploaded_at DESC
                ExclusiveStartKey: lastKey,
            })
        );
        photos.push(...((result.Items ?? []) as Photo[]));
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return photos;
}

// Count of photos with the given status via the byStatus GSI, optionally
// restricted to uploads after the given ISO timestamp. Select: COUNT — no
// items are materialised.
export async function countPhotosByStatus(
    status: Photo["status"],
    sinceIso?: string
): Promise<number> {
    let count = 0;
    let lastKey: Record<string, unknown> | undefined;
    do {
        const result = await docClient.send(
            new QueryCommand({
                TableName: PHOTOS_TABLE,
                IndexName: "byStatus",
                KeyConditionExpression: sinceIso
                    ? "#status = :status AND uploaded_at > :since"
                    : "#status = :status",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: sinceIso
                    ? { ":status": status, ":since": sinceIso }
                    : { ":status": status },
                Select: "COUNT",
                ExclusiveStartKey: lastKey,
            })
        );
        count += result.Count ?? 0;
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return count;
}

export interface ModerationUpdate {
    status: "approved" | "rejected";
    categoryId?: string | null;
    approvedBy: string | null;
}

// Returns false when no photo with that id exists.
export async function updatePhotoModeration(
    id: string,
    update: ModerationUpdate
): Promise<boolean> {
    const sets = ["#status = :status"];
    const names: Record<string, string> = { "#status": "status" };
    const values: Record<string, unknown> = { ":status": update.status };

    if (update.categoryId != null) {
        sets.push("category_id = :category_id");
        values[":category_id"] = update.categoryId;
    }
    if (update.status === "approved") {
        sets.push("approved_at = :approved_at", "approved_by = :approved_by");
        values[":approved_at"] = new Date().toISOString();
        values[":approved_by"] = update.approvedBy;
    }

    try {
        await docClient.send(
            new UpdateCommand({
                TableName: PHOTOS_TABLE,
                Key: { id },
                UpdateExpression: `SET ${sets.join(", ")}`,
                ConditionExpression: "attribute_exists(id)",
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: values,
            })
        );
        return true;
    } catch (error) {
        if (error instanceof ConditionalCheckFailedException) return false;
        throw error;
    }
}
