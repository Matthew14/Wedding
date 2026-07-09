import { NextRequest, NextResponse } from "next/server";
import { isValidInvitationCode } from "@/utils/db/archive";

export async function POST(request: NextRequest) {
    try {
        const { code } = await request.json();
        if (!code || typeof code !== "string") {
            return NextResponse.json({ error: "code is required" }, { status: 400 });
        }

        const valid = await isValidInvitationCode(code.trim().toUpperCase());
        if (!valid) {
            return NextResponse.json({ valid: false, error: "Invalid invitation code" });
        }

        return NextResponse.json({ valid: true });
    } catch (error) {
        console.error("Error in POST /api/photos/validate-code:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
