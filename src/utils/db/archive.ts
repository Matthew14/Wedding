import { GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, ARCHIVE_TABLE } from "./dynamo";

// The archive table holds the frozen post-wedding dataset (~141 items):
//   CODE#<code>       / META          — invitation code
//   INVITATION#<id>   / META          — invitation
//   INVITATION#<id>   / RSVP#<id>     — archived RSVP
//   INVITATION#<id>   / INVITEE#<id>  — archived invitee
// Dashboard reads scan the whole table and assemble in code — at this size
// that is cheaper and simpler than maintaining GSIs.

interface InvitationItem {
    entity: "invitation";
    id: number;
    is_matthew_side: boolean;
    sent: boolean;
    villa_offered: boolean;
}

interface RsvpItem {
    entity: "rsvp";
    id: number;
    invitation_id: number;
    accepted: boolean | null;
    staying_villa: boolean | null;
}

interface InviteeItem {
    entity: "invitee";
    id: number;
    invitation_id: number;
    first_name: string;
    last_name: string;
    coming: boolean | null;
}

interface CodeItem {
    entity: "code";
    code: string;
    invitation_id: number;
}

type ArchiveItem = InvitationItem | RsvpItem | InviteeItem | CodeItem;

export interface ArchiveSummary {
    invitations: { total: number; sent: number };
    rsvps: { total: number; received: number; accepted: number; declined: number };
    guests: { total: number; coming: number; notComing: number; undecided: number };
}

export interface InvitationCodeSummary {
    code: string;
    invitation_id: number;
    is_matthew_side: boolean;
    invitee_names: string[];
}

export async function isValidInvitationCode(code: string): Promise<boolean> {
    const result = await docClient.send(
        new GetCommand({
            TableName: ARCHIVE_TABLE,
            Key: { PK: `CODE#${code}`, SK: "META" },
        })
    );
    return result.Item !== undefined;
}

// First names of the invitees behind a code, or null when the code doesn't
// exist. Returning names behind a valid code is fine — the code is the
// guest's credential.
export async function getInviteesByCode(code: string): Promise<string[] | null> {
    const codeResult = await docClient.send(
        new GetCommand({
            TableName: ARCHIVE_TABLE,
            Key: { PK: `CODE#${code}`, SK: "META" },
        })
    );
    const codeItem = codeResult.Item as CodeItem | undefined;
    if (!codeItem) return null;

    const result = await docClient.send(
        new QueryCommand({
            TableName: ARCHIVE_TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": `INVITATION#${codeItem.invitation_id}`,
                ":sk": "INVITEE#",
            },
        })
    );
    const invitees = (result.Items ?? []) as InviteeItem[];
    return invitees.map((i) => i.first_name).sort((a, b) => a.localeCompare(b));
}

async function scanArchive(): Promise<ArchiveItem[]> {
    const items: ArchiveItem[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
        const result = await docClient.send(
            new ScanCommand({ TableName: ARCHIVE_TABLE, ExclusiveStartKey: lastKey })
        );
        items.push(...((result.Items ?? []) as ArchiveItem[]));
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return items;
}

export async function getArchiveSummary(): Promise<ArchiveSummary> {
    const items = await scanArchive();

    const invitations = items.filter((i): i is InvitationItem => i.entity === "invitation");
    const rsvps = items.filter((i): i is RsvpItem => i.entity === "rsvp");
    const invitees = items.filter((i): i is InviteeItem => i.entity === "invitee");

    return {
        invitations: {
            total: invitations.length,
            sent: invitations.filter((i) => i.sent).length,
        },
        rsvps: {
            total: rsvps.length,
            received: rsvps.filter((r) => r.accepted !== null).length,
            accepted: rsvps.filter((r) => r.accepted === true).length,
            declined: rsvps.filter((r) => r.accepted === false).length,
        },
        guests: {
            total: invitees.length,
            coming: invitees.filter((g) => g.coming === true).length,
            notComing: invitees.filter((g) => g.coming === false).length,
            undecided: invitees.filter((g) => g.coming === null).length,
        },
    };
}

export async function listInvitationCodes(): Promise<InvitationCodeSummary[]> {
    const items = await scanArchive();

    const invitationsById = new Map<number, InvitationItem>();
    const inviteesByInvitation = new Map<number, InviteeItem[]>();
    const codes: CodeItem[] = [];

    for (const item of items) {
        if (item.entity === "invitation") invitationsById.set(item.id, item);
        else if (item.entity === "code") codes.push(item);
        else if (item.entity === "invitee") {
            const list = inviteesByInvitation.get(item.invitation_id) ?? [];
            list.push(item);
            inviteesByInvitation.set(item.invitation_id, list);
        }
    }

    return codes
        .map((c) => {
            const invitees = inviteesByInvitation.get(c.invitation_id) ?? [];
            invitees.sort((a, b) => a.first_name.localeCompare(b.first_name));
            return {
                code: c.code,
                invitation_id: c.invitation_id,
                is_matthew_side: invitationsById.get(c.invitation_id)?.is_matthew_side ?? false,
                invitee_names: invitees.map((i) => `${i.first_name} ${i.last_name}`),
            };
        })
        .sort((a, b) => a.invitation_id - b.invitation_id);
}
