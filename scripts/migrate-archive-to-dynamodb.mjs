// One-off migration of the frozen wedding archive into DynamoDB (#150).
//
// Reads the verified local JSON export produced from Aurora (one file per
// table) and writes the wedding-archive table items:
//   CODE#<code>       / META          — invitation code
//   INVITATION#<id>   / META          — invitation
//   INVITATION#<id>   / RSVP#<id>     — archived RSVP
//   INVITATION#<id>   / INVITEE#<id>  — archived invitee
//
// `faqs` is intentionally not migrated — the FAQ feature was removed.
// Idempotent: puts overwrite by key, so re-running converges.
//
// Usage: AWS_PROFILE=wedding node scripts/migrate-archive-to-dynamodb.mjs <backup-tables-dir>
// Set AWS_ENDPOINT_URL to load the archive into LocalStack instead of prod.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
    console.error("Usage: node scripts/migrate-archive-to-dynamodb.mjs <backup-tables-dir>");
    process.exit(1);
}

const endpoint = process.env.AWS_ENDPOINT_URL;
const TABLE = process.env.DDB_ARCHIVE_TABLE ?? "wedding-archive";
const docClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({
        region: process.env.AWS_REGION ?? "eu-west-1",
        ...(endpoint && { endpoint }),
    }),
    { marshallOptions: { removeUndefinedValues: true } }
);

// The pg dump renders timestamptz as "YYYY-MM-DD HH:MM:SS.ffffff" (UTC).
const toIso = (ts) => (ts ? `${ts.replace(" ", "T")}Z` : ts);

const load = async (name) => JSON.parse(await readFile(join(dir, `${name}.json`), "utf8"));

const [invitations, codes, rsvps, invitees] = await Promise.all([
    load("invitations"),
    load("invitation_codes"),
    load("rsvp_archive"),
    load("invitee_archive"),
]);

const items = [
    ...invitations.map((r) => ({
        PK: `INVITATION#${r.id}`,
        SK: "META",
        entity: "invitation",
        id: r.id,
        is_matthew_side: r.is_matthew_side,
        sent: r.sent,
        villa_offered: r.villa_offered,
        created_at: toIso(r.created_at),
    })),
    ...codes.map((r) => ({
        PK: `CODE#${r.code}`,
        SK: "META",
        entity: "code",
        code: r.code,
        invitation_id: r.invitation_id,
        created_at: toIso(r.created_at),
    })),
    ...rsvps.map((r) => ({
        PK: `INVITATION#${r.invitation_id}`,
        SK: `RSVP#${r.id}`,
        entity: "rsvp",
        id: r.id,
        invitation_id: r.invitation_id,
        code: r.code,
        accepted: r.accepted,
        staying_villa: r.staying_villa,
        dietary_restrictions: r.dietary_restrictions,
        song_request: r.song_request,
        travel_plans: r.travel_plans,
        message: r.message,
        created_at: toIso(r.created_at),
        updated_at: toIso(r.updated_at),
    })),
    ...invitees.map((r) => ({
        PK: `INVITATION#${r.invitation_id}`,
        SK: `INVITEE#${r.id}`,
        entity: "invitee",
        id: r.id,
        invitation_id: r.invitation_id,
        first_name: r.first_name,
        last_name: r.last_name,
        coming: r.coming,
        is_primary: r.is_primary,
        table_number: r.table_number,
        seat_number: r.seat_number,
        created_at: toIso(r.created_at),
        updated_at: toIso(r.updated_at),
    })),
];

console.log(`Writing ${items.length} items to ${TABLE}...`);
for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    let request = { [TABLE]: batch.map((Item) => ({ PutRequest: { Item } })) };
    // Retry unprocessed items until drained.
    while (Object.keys(request).length) {
        const res = await docClient.send(new BatchWriteCommand({ RequestItems: request }));
        request = res.UnprocessedItems ?? {};
        if (Object.keys(request).length) await new Promise((r) => setTimeout(r, 500));
    }
}

// ── Verify: count items per entity and compare with the source ──
const counts = {};
let lastKey;
do {
    const res = await docClient.send(new ScanCommand({ TableName: TABLE, ExclusiveStartKey: lastKey }));
    for (const item of res.Items ?? []) counts[item.entity] = (counts[item.entity] ?? 0) + 1;
    lastKey = res.LastEvaluatedKey;
} while (lastKey);

const expected = {
    invitation: invitations.length,
    code: codes.length,
    rsvp: rsvps.length,
    invitee: invitees.length,
};

let ok = true;
for (const [entity, want] of Object.entries(expected)) {
    const got = counts[entity] ?? 0;
    const match = got === want ? "✓" : "✗";
    if (got !== want) ok = false;
    console.log(`${match} ${entity}: ${got}/${want}`);
}
if (!ok) {
    console.error("Count mismatch — investigate before cutting over.");
    process.exit(1);
}
console.log("✅ migration verified");
