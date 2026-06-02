import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/db/client";
import { requireAuth } from "@/utils/auth/requireAuth";

export interface FAQ {
    id?: string;
    question: string;
    answer: string;
    created_at?: string;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = getDb();
        const { rows } = await db.query<FAQ>("SELECT * FROM faqs WHERE id = $1", [id]);

        if (rows.length === 0) {
            return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
        }

        return NextResponse.json({ faq: rows[0] });
    } catch (error) {
        console.error("Error in GET /api/faqs/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const { id } = await params;
        const { id: newId, question, answer }: FAQ = await request.json();

        if (!question || !answer) {
            return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
        }

        const db = getDb();
        const updateData: Record<string, string> = {
            question: question.trim(),
            answer: answer.trim(),
        };
        if (newId?.trim() && newId.trim() !== id) {
            updateData.id = newId.trim();
        }

        const setClauses = Object.keys(updateData)
            .map((k, i) => `${k} = $${i + 1}`)
            .join(", ");
        const values = [...Object.values(updateData), id];

        const { rows } = await db.query<FAQ>(
            `UPDATE faqs SET ${setClauses} WHERE id = $${values.length} RETURNING *`,
            values
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
        }

        return NextResponse.json({ faq: rows[0] });
    } catch (error) {
        console.error("Error in PUT /api/faqs/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const { id } = await params;
        const db = getDb();
        await db.query("DELETE FROM faqs WHERE id = $1", [id]);
        return NextResponse.json({ message: "FAQ deleted successfully" });
    } catch (error) {
        console.error("Error in DELETE /api/faqs/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
