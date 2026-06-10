import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/utils/db/client";
import { requireAuth } from "@/utils/auth/requireAuth";

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if (!auth.success) return auth.response;

    try {
        const db = getDb();

        const [invitationsRes, rsvpsRes, inviteesRes] = await Promise.all([
            db.query<{ total: string; sent: string }>(
                "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE sent = true) AS sent FROM invitations"
            ),
            db.query<{
                total: string;
                received: string;
                accepted: string;
                declined: string;
                staying_yes: string;
                staying_no: string;
                villa_undecided: string;
            }>(
                `SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE accepted IS NOT NULL) AS received,
                    COUNT(*) FILTER (WHERE accepted = true) AS accepted,
                    COUNT(*) FILTER (WHERE accepted = false) AS declined,
                    COUNT(*) FILTER (WHERE staying_villa = true) AS staying_yes,
                    COUNT(*) FILTER (WHERE staying_villa = false) AS staying_no,
                    COUNT(*) FILTER (WHERE staying_villa IS NULL) AS villa_undecided
                FROM rsvp_archive`
            ),
            db.query<{ total: string; coming: string; not_coming: string; undecided: string }>(
                `SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE coming = true) AS coming,
                    COUNT(*) FILTER (WHERE coming = false) AS not_coming,
                    COUNT(*) FILTER (WHERE coming IS NULL) AS undecided
                FROM invitee_archive`
            ),
        ]);

        const inv = invitationsRes.rows[0];
        const r = rsvpsRes.rows[0];
        const g = inviteesRes.rows[0];

        return NextResponse.json({
            summary: {
                invitations: { total: Number(inv.total), sent: Number(inv.sent) },
                rsvps: {
                    total: Number(r.total),
                    received: Number(r.received),
                    accepted: Number(r.accepted),
                    declined: Number(r.declined),
                },
                guests: {
                    total: Number(g.total),
                    coming: Number(g.coming),
                    notComing: Number(g.not_coming),
                    undecided: Number(g.undecided),
                },
                villa: {
                    stayingYes: Number(r.staying_yes),
                    stayingNo: Number(r.staying_no),
                    undecided: Number(r.villa_undecided),
                },
            },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Error in GET /api/dashboard/summary:", error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
