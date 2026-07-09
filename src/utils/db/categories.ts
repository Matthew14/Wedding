import { PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";
import { docClient, CATEGORIES_TABLE } from "./dynamo";

// The raw category item — cover_thumbnail resolution happens in the route,
// which joins against the photos table.
export interface CategoryItem {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    event_day: "friday" | "saturday" | "sunday" | null;
    cover_photo_id: string | null;
    sort_order: number;
    created_at: string;
}

// The table holds a handful of items, so listing and slug lookups are scans.
export async function listCategories(): Promise<CategoryItem[]> {
    const result = await docClient.send(new ScanCommand({ TableName: CATEGORIES_TABLE }));
    const categories = (result.Items ?? []) as CategoryItem[];
    return categories.sort((a, b) => a.sort_order - b.sort_order);
}

export async function getCategoryBySlug(slug: string): Promise<CategoryItem | null> {
    const categories = await listCategories();
    return categories.find((c) => c.slug === slug) ?? null;
}

export interface CreateCategoryInput {
    name: string;
    slug: string;
    description: string | null;
    event_day: "friday" | "saturday" | "sunday" | null;
    sort_order: number;
}

export interface UpdateCategoryInput {
    name?: string;
    description?: string | null;
    sort_order?: number;
}

// Display-field updates only — slug is the public URL/filter key and stays
// immutable. Returns the updated item, or null when no category has that id.
export async function updateCategory(
    id: string,
    fields: UpdateCategoryInput
): Promise<CategoryItem | null> {
    const sets: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};

    if (fields.name !== undefined) {
        sets.push("#name = :name");
        names["#name"] = "name";
        values[":name"] = fields.name;
    }
    if (fields.description !== undefined) {
        sets.push("#description = :description");
        names["#description"] = "description";
        values[":description"] = fields.description;
    }
    if (fields.sort_order !== undefined) {
        sets.push("#sort_order = :sort_order");
        names["#sort_order"] = "sort_order";
        values[":sort_order"] = fields.sort_order;
    }
    if (sets.length === 0) {
        throw new Error("updateCategory called with no fields to update");
    }

    try {
        const result = await docClient.send(
            new UpdateCommand({
                TableName: CATEGORIES_TABLE,
                Key: { id },
                UpdateExpression: `SET ${sets.join(", ")}`,
                ConditionExpression: "attribute_exists(id)",
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: values,
                ReturnValues: "ALL_NEW",
            })
        );
        return result.Attributes as CategoryItem;
    } catch (error) {
        if (error instanceof ConditionalCheckFailedException) return null;
        throw error;
    }
}

// Slug uniqueness is enforced by a pre-check rather than a constraint; the
// endpoint is admin-only so a race here is not a realistic concern.
export async function createCategory(input: CreateCategoryInput): Promise<CategoryItem | "duplicate-slug"> {
    const existing = await getCategoryBySlug(input.slug);
    if (existing) return "duplicate-slug";

    const category: CategoryItem = {
        id: randomUUID(),
        name: input.name,
        slug: input.slug,
        description: input.description,
        event_day: input.event_day,
        cover_photo_id: null,
        sort_order: input.sort_order,
        created_at: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({ TableName: CATEGORIES_TABLE, Item: category }));
    return category;
}
