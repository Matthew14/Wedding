import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/db/client";

export async function POST(request: NextRequest) {
    try {
        const { code } = await request.json();
        if (!code || typeof code !== "string") {
            return NextResponse.json({ error: "code is required" }, { status: 400 });
        }

        const db = getDb();
        const { rows } = await db.query<{ code: string }>(
            "SELECT code FROM invitation_codes WHERE code = $1",
            [code.trim().toUpperCase()]
        );

        if (rows.length === 0) {
            return NextResponse.json({ valid: false, error: "Invalid invitation code" });
        }

        return NextResponse.json({ valid: true });
    } catch (error) {
        console.error("Error in POST /api/photos/validate-code:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
