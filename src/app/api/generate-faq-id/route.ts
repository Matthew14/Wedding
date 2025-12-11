import { NextRequest, NextResponse } from "next/server";

/**
 * Generates a kebab-case ID from the first 3 words of a question
 * @param question The FAQ question
 * @returns A kebab-case string of the first 3 words
 */
function generateQuestionId(question: string): string {
    // Remove punctuation and extra whitespace, then split into words
    const words = question
        .toLowerCase()
        .replace(/[^\w\s]/g, "") // Remove punctuation
        .trim()
        .split(/\s+/) // Split on whitespace
        .slice(0, 3); // Take first 3 words

    // Join with hyphens and ensure valid kebab-case
    return words
        .join("-")
        .replace(/[^a-z0-9-]/g, "") // Remove any remaining invalid characters
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

export async function POST(request: NextRequest) {
    try {
        const { question } = await request.json();

        if (!question || typeof question !== "string") {
            return NextResponse.json({ error: "Question is required and must be a string" }, { status: 400 });
        }

        const questionId = generateQuestionId(question);

        return NextResponse.json({
            questionId,
        });
    } catch (error) {
        console.error("Error generating question ID:", error);

        return NextResponse.json(
            {
                error: "Failed to generate question ID",
            },
            { status: 500 }
        );
    }
}
