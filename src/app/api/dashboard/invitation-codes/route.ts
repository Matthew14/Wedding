import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/db/client";
import { requireAuth } from "@/utils/auth/requireAuth";

interface InvitationCodeRow {
    code: string;
    invitation_id: number;
    is_matthew_side: boolean;
    invitee_names: string[] | null;
}

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const db = getDb();
        const { rows } = await db.query<InvitationCodeRow>(
            `SELECT
                ic.code,
                ic.invitation_id,
                inv.is_matthew_side,
                ARRAY_AGG(ia.first_name || ' ' || ia.last_name ORDER BY ia.first_name) FILTER (WHERE ia.id IS NOT NULL) AS invitee_names
            FROM invitation_codes ic
            JOIN invitations inv ON inv.id = ic.invitation_id
            LEFT JOIN invitee_archive ia ON ia.invitation_id = ic.invitation_id
            GROUP BY ic.code, ic.invitation_id, inv.is_matthew_side
            ORDER BY ic.invitation_id`
        );

        return NextResponse.json({
            codes: rows.map(r => ({
                ...r,
                invitee_names: r.invitee_names ?? [],
            })),
        });
    } catch (error) {
        console.error("Error in GET /api/dashboard/invitation-codes:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
