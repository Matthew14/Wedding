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

export interface InviteeSummary {
    id: number;
    invitation_id: number;
    name: string;
    code: string | null;
}

// The bride & groom's master code lives in an env var, not the frozen
// archive — it validates everywhere a guest code does, and /api/auth/me
// hands it to logged-in admins so the gallery can auto-fill it.
export function isMasterCode(code: string): boolean {
    const master = process.env.MASTER_INVITATION_CODE;
    return !!master && code === master;
}

export async function isValidInvitationCode(code: string): Promise<boolean> {
    if (isMasterCode(code)) return true;
    const result = await docClient.send(
        new GetCommand({
            TableName: ARCHIVE_TABLE,
            Key: { PK: `CODE#${code}`, SK: "META" },
        })
    );
    return result.Item !== undefined;
}

// The invitation behind a guest code, or null when the code doesn't exist.
// The master code also resolves to null: it belongs to the couple, not an
// archived invitation, so there is no household behind it.
export async function getInvitationIdByCode(code: string): Promise<number | null> {
    if (isMasterCode(code)) return null;
    const result = await docClient.send(
        new GetCommand({
            TableName: ARCHIVE_TABLE,
            Key: { PK: `CODE#${code}`, SK: "META" },
        })
    );
    return (result.Item as CodeItem | undefined)?.invitation_id ?? null;
}

// The invitees of an invitation with their ids, for face-match lookups.
export async function getInviteesWithIds(
    invitationId: number
): Promise<{ id: number; first_name: string }[]> {
    const result = await docClient.send(
        new QueryCommand({
            TableName: ARCHIVE_TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": `INVITATION#${invitationId}`,
                ":sk": "INVITEE#",
            },
        })
    );
    return ((result.Items ?? []) as InviteeItem[])
        .map((i) => ({ id: i.id, first_name: i.first_name }))
        .sort((a, b) => a.first_name.localeCompare(b.first_name));
}

// First names of the invitees behind a code, or null when the code doesn't
// exist. Returning names behind a valid code is fine — the code is the
// guest's credential.
export async function getInviteesByCode(code: string): Promise<string[] | null> {
    if (isMasterCode(code)) return COUPLE_INVITEES.map((c) => c.name.split(" ")[0]);
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

// The bride & groom aren't archived invitees (nobody sent them an invitation
// to their own wedding), so they get reserved synthetic ids — negative, to
// stay clear of the Postgres-era serial ids — making their face clusters
// assignable like anyone else's. Their "code" is the master code env var,
// never an archive row, hence code: null here.
export const COUPLE_INVITEES: InviteeSummary[] = [
    { id: -1, invitation_id: -1, name: "Matthew O'Neill", code: null },
    { id: -2, invitation_id: -1, name: "Rebecca O'Neill", code: null },
];

// The couple's dog. Dog detections (Rekognition DetectLabels, not face
// matching) are stored as ordinary face rows and assigned to her like any
// person, so she surfaces through the gallery's people search once her
// detections are labeled. Deliberately NOT part of COUPLE_INVITEES — the
// master code's Find My Photos stays humans-only.
export const MAGGIE_INVITEE: InviteeSummary = {
    id: -3,
    invitation_id: -1,
    name: "Maggie",
    code: null,
};

// "Aoife" / "Aoife & Brian" / "Aoife, Brian & Cara"
function joinFirstNames(names: string[]): string {
    if (names.length <= 1) return names[0] ?? "";
    return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

// Upload attribution: display names for the household behind each invitation
// code ("Aoife & Brian"), plus the master code mapped to the couple. Guest
// uploads carry their code on the photo row; photos without a code (the
// professional imports) simply aren't in this map. One archive scan.
export async function listUploaderNames(): Promise<Map<string, string>> {
    const items = await scanArchive();

    const firstNamesByInvitation = new Map<number, string[]>();
    for (const item of items) {
        if (item.entity !== "invitee") continue;
        const names = firstNamesByInvitation.get(item.invitation_id) ?? [];
        names.push(item.first_name);
        firstNamesByInvitation.set(item.invitation_id, names);
    }

    const uploaders = new Map<string, string>();
    for (const item of items) {
        if (item.entity !== "code") continue;
        const names = (firstNamesByInvitation.get(item.invitation_id) ?? []).sort((a, b) =>
            a.localeCompare(b)
        );
        if (names.length > 0) uploaders.set(item.code, joinFirstNames(names));
    }

    const master = process.env.MASTER_INVITATION_CODE;
    if (master) {
        uploaders.set(master, joinFirstNames(COUPLE_INVITEES.map((c) => c.name.split(" ")[0])));
    }
    return uploaders;
}

// Every assignable person for the face-cluster picker: archived invitees
// with their invitation's code, plus the couple. Alphabetical by full name.
export async function listAllInvitees(): Promise<InviteeSummary[]> {
    const items = await scanArchive();

    const codeByInvitation = new Map<number, string>();
    for (const item of items) {
        if (item.entity === "code") codeByInvitation.set(item.invitation_id, item.code);
    }

    return items
        .filter((i): i is InviteeItem => i.entity === "invitee")
        .map((i) => ({
            id: i.id,
            invitation_id: i.invitation_id,
            name: `${i.first_name} ${i.last_name}`,
            code: codeByInvitation.get(i.invitation_id) ?? null,
        }))
        .concat(COUPLE_INVITEES, MAGGIE_INVITEE)
        .sort((a, b) => a.name.localeCompare(b.name));
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
