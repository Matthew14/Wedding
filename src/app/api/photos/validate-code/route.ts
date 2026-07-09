import { NextRequest, NextResponse } from "next/server";
import { getInviteesByCode } from "@/utils/db/archive";

export async function POST(request: NextRequest) {
    try {
        const { code } = await request.json();
        if (!code || typeof code !== "string") {
            return NextResponse.json({ error: "code is required" }, { status: 400 });
        }

        const names = await getInviteesByCode(code.trim().toUpperCase());
        if (names === null) {
            return NextResponse.json({ valid: false, error: "Invalid invitation code" });
        }

        return NextResponse.json({ valid: true, names });
    } catch (error) {
        console.error("Error in POST /api/photos/validate-code:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
