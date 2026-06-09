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

        let rows: FAQ[];
        if (newId?.trim() && newId.trim() !== id) {
            ({ rows } = await db.query<FAQ>(
                "UPDATE faqs SET id = $1, question = $2, answer = $3 WHERE id = $4 RETURNING *",
                [newId.trim(), question.trim(), answer.trim(), id]
            ));
        } else {
            ({ rows } = await db.query<FAQ>(
                "UPDATE faqs SET question = $1, answer = $2 WHERE id = $3 RETURNING *",
                [question.trim(), answer.trim(), id]
            ));
        }

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
        const { rows } = await db.query("DELETE FROM faqs WHERE id = $1 RETURNING id", [id]);
        if (rows.length === 0) {
            return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
        }
        return NextResponse.json({ message: "FAQ deleted successfully" });
    } catch (error) {
        console.error("Error in DELETE /api/faqs/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
