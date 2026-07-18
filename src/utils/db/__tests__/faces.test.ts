import { describe, it, expect, beforeEach, vi } from "vitest";

const mockSend = vi.fn();

vi.mock("../dynamo", () => ({
    docClient: { send: (...args: unknown[]) => mockSend(...args) },
    FACES_TABLE: "wedding-photo-faces",
}));

import { getFacesByInvitees, updateClusterAssignment } from "../faces";

interface SentCommand {
    input: {
        IndexName?: string;
        UpdateExpression?: string;
        ExpressionAttributeValues?: Record<string, unknown>;
        Key?: Record<string, unknown>;
    };
}

const sentCommand = (call: number): SentCommand["input"] =>
    (mockSend.mock.calls[call][0] as SentCommand).input;

describe("getFacesByInvitees", () => {
    beforeEach(() => vi.clearAllMocks());

    it("queries the byInvitee GSI per invitee and flattens the results", async () => {
        mockSend
            .mockResolvedValueOnce({ Items: [{ face_id: "f1", invitee_id: 1 }] })
            .mockResolvedValueOnce({ Items: [{ face_id: "f2", invitee_id: 2 }] });

        const faces = await getFacesByInvitees([1, 2]);

        expect(faces.map((f) => f.face_id).sort()).toEqual(["f1", "f2"]);
        expect(mockSend).toHaveBeenCalledTimes(2);
        expect(sentCommand(0).IndexName).toBe("byInvitee");
    });

    it("returns empty for an empty household", async () => {
        expect(await getFacesByInvitees([])).toEqual([]);
        expect(mockSend).not.toHaveBeenCalled();
    });
});

describe("updateClusterAssignment", () => {
    beforeEach(() => vi.clearAllMocks());

    const clusterFaces = [{ face_id: "f1" }, { face_id: "f2" }];

    it("assigns invitee and invitation to every face and clears ignored", async () => {
        mockSend.mockResolvedValueOnce({ Items: clusterFaces }).mockResolvedValue({});

        const count = await updateClusterAssignment("c1", {
            invitee_id: 7,
            invitation_id: 3,
        });

        expect(count).toBe(2);
        // 1 cluster query + 2 face updates
        expect(mockSend).toHaveBeenCalledTimes(3);
        const update = sentCommand(1);
        expect(update.UpdateExpression).toBe(
            "SET invitee_id = :invitee, invitation_id = :invitation REMOVE ignored"
        );
        expect(update.ExpressionAttributeValues).toEqual({ ":invitee": 7, ":invitation": 3 });
        expect(sentCommand(2).Key).toEqual({ face_id: "f2" });
    });

    it("ignoring a cluster removes any invitee assignment", async () => {
        mockSend.mockResolvedValueOnce({ Items: clusterFaces }).mockResolvedValue({});

        await updateClusterAssignment("c1", { ignored: true });

        const update = sentCommand(1);
        expect(update.UpdateExpression).toBe(
            "SET ignored = :ignored REMOVE invitee_id, invitation_id"
        );
        expect(update.ExpressionAttributeValues).toEqual({ ":ignored": true });
    });

    it("clearing removes assignment and ignored flags", async () => {
        mockSend.mockResolvedValueOnce({ Items: clusterFaces }).mockResolvedValue({});

        await updateClusterAssignment("c1", null);

        expect(sentCommand(1).UpdateExpression).toBe(
            "REMOVE invitee_id, invitation_id, ignored"
        );
    });

    it("returns 0 and writes nothing for an unknown cluster", async () => {
        mockSend.mockResolvedValueOnce({ Items: [] });

        expect(await updateClusterAssignment("nope", { ignored: true })).toBe(0);
        expect(mockSend).toHaveBeenCalledTimes(1);
    });
});
