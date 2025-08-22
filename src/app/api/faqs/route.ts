import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import DOMPurify from "isomorphic-dompurify";

export interface FAQ {
    id?: string;
    question: string;
    answer: string;
    created_at?: string;
}

// GET /api/faqs - Get all FAQs
export async function GET() {
    try {
        const supabase = await createClient();

        const { data: faqs, error } = await supabase.from("FAQs").select("*").order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching FAQs:", error);
            return NextResponse.json({ error: "Failed to fetch FAQs" }, { status: 500 });
        }

        return NextResponse.json({ faqs });
    } catch (error) {
        console.error("Error in GET /api/faqs:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/faqs - Create a new FAQ
export async function POST(request: NextRequest) {
    try {
        const { id, question, answer }: FAQ = await request.json();

        if (!question || !answer) {
            return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
        }

        const supabase = await createClient();

        // Prepare the insert data with sanitization
        const insertData: Partial<FAQ> = {
            question: DOMPurify.sanitize(question.trim()),
            answer: DOMPurify.sanitize(answer.trim()),
        };

        // Only include id if it's provided (sanitize ID too)
        if (id && id.trim()) {
            insertData.id = DOMPurify.sanitize(id.trim());
        }

        const { data: faq, error } = await supabase.from("FAQs").insert([insertData]).select().single();

        if (error) {
            console.error("Error creating FAQ:", error);
            return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 });
        }

        return NextResponse.json({ faq }, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/faqs:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
