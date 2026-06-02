import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/db/client";
import { requireAuth } from "@/utils/auth/requireAuth";

export interface FAQ {
    id?: string;
    question: string;
    answer: string;
    created_at?: string;
}

export async function GET() {
    try {
        const db = getDb();
        const { rows } = await db.query<FAQ>(
            "SELECT id, question, answer, created_at FROM faqs ORDER BY created_at ASC"
        );
        return NextResponse.json({ faqs: rows });
    } catch (error) {
        console.error("Error in GET /api/faqs:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const { id, question, answer }: FAQ = await request.json();

        if (!question || !answer) {
            return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
        }

        const db = getDb();
        let row: FAQ;

        if (id?.trim()) {
            const { rows } = await db.query<FAQ>(
                "INSERT INTO faqs (id, question, answer) VALUES ($1, $2, $3) RETURNING *",
                [id.trim(), question.trim(), answer.trim()]
            );
            row = rows[0];
        } else {
            const { rows } = await db.query<FAQ>(
                "INSERT INTO faqs (question, answer) VALUES ($1, $2) RETURNING *",
                [question.trim(), answer.trim()]
            );
            row = rows[0];
        }

        return NextResponse.json({ faq: row }, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/faqs:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
