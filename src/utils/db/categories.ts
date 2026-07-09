import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
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
