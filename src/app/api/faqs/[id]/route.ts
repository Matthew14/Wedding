import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import DOMPurify from "isomorphic-dompurify";

export interface FAQ {
    id?: string;
    question: string;
    answer: string;
    created_at?: string;
}

// GET /api/faqs/[id] - Get a specific FAQ
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { data: faq, error } = await supabase.from("FAQs").select("*").eq("id", id).single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
            }
            console.error("Error fetching FAQ:", error);
            return NextResponse.json({ error: "Failed to fetch FAQ" }, { status: 500 });
        }

        return NextResponse.json({ faq });
    } catch (error) {
        console.error("Error in GET /api/faqs/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT /api/faqs/[id] - Update a specific FAQ
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { id: newId, question, answer }: FAQ = await request.json();

        if (!question || !answer) {
            return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
        }

        const supabase = await createClient();

        // Prepare the update data with sanitization
        const updateData: Partial<FAQ> = {
            question: DOMPurify.sanitize(question.trim()),
            answer: DOMPurify.sanitize(answer.trim()),
        };

        // Only include id if it's provided and different from current (sanitize ID too)
        if (newId && newId.trim() && newId.trim() !== id) {
            updateData.id = DOMPurify.sanitize(newId.trim());
        }

        const { data: faq, error } = await supabase.from("FAQs").update(updateData).eq("id", id).select().single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
            }
            console.error("Error updating FAQ:", error);
            return NextResponse.json({ error: "Failed to update FAQ" }, { status: 500 });
        }

        return NextResponse.json({ faq });
    } catch (error) {
        console.error("Error in PUT /api/faqs/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/faqs/[id] - Delete a specific FAQ
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { error } = await supabase.from("FAQs").delete().eq("id", id);

        if (error) {
            console.error("Error deleting FAQ:", error);
            return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 });
        }

        return NextResponse.json({ message: "FAQ deleted successfully" });
    } catch (error) {
        console.error("Error in DELETE /api/faqs/[id]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
