import { GetCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";
import { docClient, FACES_TABLE } from "./dynamo";
import type { ClusterAssignment, PhotoFace } from "@/types/faces";

// The whole table, for the admin labeling page (which groups by cluster in
// code). A few thousand tiny items — one or two scan pages.
export async function listAllFaces(): Promise<PhotoFace[]> {
    const faces: PhotoFace[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
        const result = await docClient.send(
            new ScanCommand({ TableName: FACES_TABLE, ExclusiveStartKey: lastKey })
        );
        faces.push(...((result.Items ?? []) as PhotoFace[]));
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return faces;
}

export async function getFacesByCluster(clusterId: string): Promise<PhotoFace[]> {
    const faces: PhotoFace[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
        const result = await docClient.send(
            new QueryCommand({
                TableName: FACES_TABLE,
                IndexName: "byCluster",
                KeyConditionExpression: "cluster_id = :cluster",
                ExpressionAttributeValues: { ":cluster": clusterId },
                ExclusiveStartKey: lastKey,
            })
        );
        faces.push(...((result.Items ?? []) as PhotoFace[]));
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return faces;
}

export async function getFacesByPhoto(photoId: string): Promise<PhotoFace[]> {
    const result = await docClient.send(
        new QueryCommand({
            TableName: FACES_TABLE,
            IndexName: "byPhoto",
            KeyConditionExpression: "photo_id = :photo",
            ExpressionAttributeValues: { ":photo": photoId },
        })
    );
    return (result.Items ?? []) as PhotoFace[];
}

// Faces assigned to any of the given invitees (a household). The byInvitee
// GSI is sparse, so unassigned faces never appear. Households are ≤ ~6
// people, so parallel queries are fine.
export async function getFacesByInvitees(inviteeIds: number[]): Promise<PhotoFace[]> {
    const results = await Promise.all(
        inviteeIds.map(async (inviteeId) => {
            const faces: PhotoFace[] = [];
            let lastKey: Record<string, unknown> | undefined;
            do {
                const result = await docClient.send(
                    new QueryCommand({
                        TableName: FACES_TABLE,
                        IndexName: "byInvitee",
                        KeyConditionExpression: "invitee_id = :invitee",
                        ExpressionAttributeValues: { ":invitee": inviteeId },
                        ExclusiveStartKey: lastKey,
                    })
                );
                faces.push(...((result.Items ?? []) as PhotoFace[]));
                lastKey = result.LastEvaluatedKey;
            } while (lastKey);
            return faces;
        })
    );
    return results.flat();
}

// An admin rejected this face from its person: sever it into a fresh,
// unassigned singleton cluster. It disappears from the person (and from
// guest results) immediately, but reappears in the Unassigned tab — if it's
// really a different guest, it can be labeled correctly from there. The
// rejected person is recorded on the row so automated re-matching can never
// re-attach the face to them (to Rekognition it still LOOKS like that
// person — that's why it was mis-clustered — so without this memory the
// re-matcher would fight the admin's corrections). Returns false when no
// such face exists.
export async function detachFace(faceId: string): Promise<boolean> {
    const current = await docClient.send(
        new GetCommand({
            TableName: FACES_TABLE,
            Key: { face_id: faceId },
            ProjectionExpression: "invitee_id",
        })
    );
    if (!current.Item) return false;
    const rejectedFrom = (current.Item as { invitee_id?: number }).invitee_id;

    try {
        await docClient.send(
            new UpdateCommand({
                TableName: FACES_TABLE,
                Key: { face_id: faceId },
                UpdateExpression:
                    rejectedFrom != null
                        ? "SET cluster_id = :fresh, rejected_invitee_ids = list_append(if_not_exists(rejected_invitee_ids, :empty), :rejected) REMOVE invitee_id, invitation_id, ignored"
                        : "SET cluster_id = :fresh REMOVE invitee_id, invitation_id, ignored",
                ConditionExpression: "attribute_exists(face_id)",
                ExpressionAttributeValues:
                    rejectedFrom != null
                        ? { ":fresh": randomUUID(), ":empty": [], ":rejected": [rejectedFrom] }
                        : { ":fresh": randomUUID() },
            })
        );
        return true;
    } catch (error) {
        if (error instanceof ConditionalCheckFailedException) return false;
        throw error;
    }
}

// Apply an assignment to every face in a cluster. Not transactional: a crash
// mid-way leaves a partial assignment, but re-applying converges (each face
// update is idempotent), so the admin just clicks again.
export async function updateClusterAssignment(
    clusterId: string,
    assignment: ClusterAssignment
): Promise<number> {
    const faces = await getFacesByCluster(clusterId);

    for (const face of faces) {
        if (assignment === null) {
            await docClient.send(
                new UpdateCommand({
                    TableName: FACES_TABLE,
                    Key: { face_id: face.face_id },
                    UpdateExpression: "REMOVE invitee_id, invitation_id, ignored",
                })
            );
        } else if ("ignored" in assignment) {
            await docClient.send(
                new UpdateCommand({
                    TableName: FACES_TABLE,
                    Key: { face_id: face.face_id },
                    UpdateExpression: "SET ignored = :ignored REMOVE invitee_id, invitation_id",
                    ExpressionAttributeValues: { ":ignored": true },
                })
            );
        } else {
            await docClient.send(
                new UpdateCommand({
                    TableName: FACES_TABLE,
                    Key: { face_id: face.face_id },
                    UpdateExpression:
                        "SET invitee_id = :invitee, invitation_id = :invitation REMOVE ignored",
                    ExpressionAttributeValues: {
                        ":invitee": assignment.invitee_id,
                        ":invitation": assignment.invitation_id,
                    },
                })
            );
        }
    }

    return faces.length;
}
