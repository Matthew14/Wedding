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
    getInviteesWithIds,
    listAllInvitees,
    listUploaderNames,
    listInvitationCodes,
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

    it("names only the attending invitees behind a guest code", async () => {
        mockSend
            .mockResolvedValueOnce({ Item: { entity: "code", code: "ABC123", invitation_id: 3 } })
            .mockResolvedValueOnce({
                Items: [
                    { entity: "invitee", id: 7, invitation_id: 3, first_name: "Alice", last_name: "Byrne", coming: true },
                    { entity: "invitee", id: 8, invitation_id: 3, first_name: "John", last_name: "Byrne", coming: false },
                    { entity: "invitee", id: 9, invitation_id: 3, first_name: "Pat", last_name: "Byrne", coming: null },
                ],
            });
        expect(await getInviteesByCode("ABC123")).toEqual(["Alice"]);
    });
});

describe("getInviteesWithIds", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns only invitees who came", async () => {
        mockSend.mockResolvedValue({
            Items: [
                { entity: "invitee", id: 7, invitation_id: 3, first_name: "Alice", last_name: "Byrne", coming: true },
                { entity: "invitee", id: 8, invitation_id: 3, first_name: "John", last_name: "Byrne", coming: false },
            ],
        });
        expect(await getInviteesWithIds(3)).toEqual([{ id: 7, first_name: "Alice" }]);
    });
});

describe("listUploaderNames", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.MASTER_INVITATION_CODE = "LOCAL1";
    });
    afterEach(() => {
        if (savedMaster === undefined) delete process.env.MASTER_INVITATION_CODE;
        else process.env.MASTER_INVITATION_CODE = savedMaster;
    });

    it("maps codes to attending first names, never exposing the code in values", async () => {
        mockSend.mockResolvedValue({
            Items: [
                { entity: "code", code: "ABC123", invitation_id: 3 },
                { entity: "code", code: "SOLO01", invitation_id: 4 },
                { entity: "code", code: "EMPTY0", invitation_id: 5 }, // no invitees
                { entity: "code", code: "NOPE01", invitation_id: 6 }, // declined household
                { entity: "invitee", id: 7, invitation_id: 3, first_name: "Brian", last_name: "Byrne", coming: true },
                { entity: "invitee", id: 8, invitation_id: 3, first_name: "Aoife", last_name: "Byrne", coming: true },
                // Declined their spot — must not appear in the attribution.
                { entity: "invitee", id: 10, invitation_id: 3, first_name: "John", last_name: "Byrne", coming: false },
                { entity: "invitee", id: 9, invitation_id: 4, first_name: "Cara", last_name: "Kelly", coming: true },
                { entity: "invitee", id: 11, invitation_id: 6, first_name: "Derek", last_name: "Nolan", coming: false },
            ],
        });

        const uploaders = await listUploaderNames();

        expect(uploaders.get("ABC123")).toBe("Aoife & Brian");
        expect(uploaders.get("SOLO01")).toBe("Cara");
        expect(uploaders.has("EMPTY0")).toBe(false);
        expect(uploaders.has("NOPE01")).toBe(false);
        expect(uploaders.get("LOCAL1")).toBe("Matthew & Rebecca");
        // Display values are names only — a code appearing in a value would
        // leak the site's access credential into public payloads.
        for (const name of uploaders.values()) {
            expect(name).not.toMatch(/^[A-Z0-9]{6}$/);
        }
    });

    it("omits the master entry when the env var is unset", async () => {
        delete process.env.MASTER_INVITATION_CODE;
        mockSend.mockResolvedValue({ Items: [] });
        expect((await listUploaderNames()).size).toBe(0);
    });
});

describe("listInvitationCodes", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lists only attending households, with attending names only", async () => {
        mockSend.mockResolvedValue({
            Items: [
                { entity: "invitation", id: 3, is_matthew_side: true, sent: true, villa_offered: false },
                { entity: "invitation", id: 6, is_matthew_side: false, sent: true, villa_offered: false },
                { entity: "code", code: "ABC123", invitation_id: 3 },
                { entity: "code", code: "NOPE01", invitation_id: 6 },
                { entity: "invitee", id: 7, invitation_id: 3, first_name: "Alice", last_name: "Byrne", coming: true },
                { entity: "invitee", id: 8, invitation_id: 3, first_name: "John", last_name: "Byrne", coming: false },
                { entity: "invitee", id: 11, invitation_id: 6, first_name: "Derek", last_name: "Nolan", coming: false },
                { entity: "invitee", id: 12, invitation_id: 6, first_name: "Ena", last_name: "Nolan", coming: null },
            ],
        });

        const codes = await listInvitationCodes();

        // Invitation 6 declined/never replied — no photo link row at all;
        // invitation 3 shows only Alice, not John who didn't come.
        expect(codes).toEqual([
            {
                code: "ABC123",
                invitation_id: 3,
                is_matthew_side: true,
                invitee_names: ["Alice Byrne"],
            },
        ]);
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
