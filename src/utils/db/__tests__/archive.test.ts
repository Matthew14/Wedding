import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockSend = vi.fn();

vi.mock("../dynamo", () => ({
    docClient: { send: (...args: unknown[]) => mockSend(...args) },
    ARCHIVE_TABLE: "wedding-archive",
}));

import {
    isMasterCode,
    isValidInvitationCode,
    getInviteesByCode,
    listAllInvitees,
} from "../archive";

const savedMaster = process.env.MASTER_INVITATION_CODE;

describe("master invitation code", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.MASTER_INVITATION_CODE = "LOCAL1";
    });
    afterEach(() => {
        if (savedMaster === undefined) delete process.env.MASTER_INVITATION_CODE;
        else process.env.MASTER_INVITATION_CODE = savedMaster;
    });

    it("recognises the master code", () => {
        expect(isMasterCode("LOCAL1")).toBe(true);
        expect(isMasterCode("ABC123")).toBe(false);
    });

    it("never matches when the env var is unset", () => {
        delete process.env.MASTER_INVITATION_CODE;
        expect(isMasterCode("LOCAL1")).toBe(false);
        // In particular an empty code must not match an empty env var
        process.env.MASTER_INVITATION_CODE = "";
        expect(isMasterCode("")).toBe(false);
    });

    it("validates the master code without touching the archive", async () => {
        expect(await isValidInvitationCode("LOCAL1")).toBe(true);
        expect(mockSend).not.toHaveBeenCalled();
    });

    it("still validates guest codes against the archive", async () => {
        mockSend.mockResolvedValue({ Item: { entity: "code", code: "ABC123", invitation_id: 1 } });
        expect(await isValidInvitationCode("ABC123")).toBe(true);
        expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("returns the couple's names for the master code", async () => {
        expect(await getInviteesByCode("LOCAL1")).toEqual(["Matthew", "Rebecca"]);
        expect(mockSend).not.toHaveBeenCalled();
    });
});

describe("listAllInvitees", () => {
    beforeEach(() => vi.clearAllMocks());

    it("includes the couple as synthetic invitees alongside archived guests", async () => {
        mockSend.mockResolvedValue({
            Items: [
                { entity: "code", code: "ABC123", invitation_id: 3 },
                {
                    entity: "invitee",
                    id: 7,
                    invitation_id: 3,
                    first_name: "Aoife",
                    last_name: "Byrne",
                    coming: true,
                },
            ],
        });

        const invitees = await listAllInvitees();

        expect(invitees).toEqual([
            { id: 7, invitation_id: 3, name: "Aoife Byrne", code: "ABC123" },
            { id: -3, invitation_id: -1, name: "Maggie", code: null },
            { id: -1, invitation_id: -1, name: "Matthew O'Neill", code: null },
            { id: -2, invitation_id: -1, name: "Rebecca O'Neill", code: null },
        ]);
    });
});
