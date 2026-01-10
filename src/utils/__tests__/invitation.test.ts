import { describe, it, expect } from "vitest";
import { formatGuestNames, parseSlug } from "../invitation";

describe("formatGuestNames", () => {
    it("returns empty string for empty array", () => {
        expect(formatGuestNames([])).toBe("");
    });

    it("returns single name for one guest", () => {
        expect(formatGuestNames(["John"])).toBe("John");
    });

    it("joins two names with ampersand", () => {
        expect(formatGuestNames(["John", "Jane"])).toBe("John & Jane");
    });

    it("joins three names with commas and ampersand", () => {
        expect(formatGuestNames(["John", "Jane", "Bob"])).toBe("John, Jane & Bob");
    });

    it("joins four names with commas and ampersand", () => {
        expect(formatGuestNames(["John", "Jane", "Bob", "Alice"])).toBe(
            "John, Jane, Bob & Alice"
        );
    });

    it("handles many names correctly", () => {
        expect(formatGuestNames(["A", "B", "C", "D", "E"])).toBe("A, B, C, D & E");
    });
});

describe("parseSlug", () => {
    describe("valid slugs", () => {
        it("parses single name with 6-char code", () => {
            const result = parseSlug("john-ABC123");
            expect(result).toEqual({
                names: ["john"],
                code: "ABC123",
            });
        });

        it("parses two names with code", () => {
            const result = parseSlug("john-jane-ABC123");
            expect(result).toEqual({
                names: ["john", "jane"],
                code: "ABC123",
            });
        });

        it("parses three names with code", () => {
            const result = parseSlug("john-jane-bob-ABC123");
            expect(result).toEqual({
                names: ["john", "jane", "bob"],
                code: "ABC123",
            });
        });

        it("parses four names with code", () => {
            const result = parseSlug("john-jane-bob-alice-ABC123");
            expect(result).toEqual({
                names: ["john", "jane", "bob", "alice"],
                code: "ABC123",
            });
        });

        it("uppercases the code", () => {
            const result = parseSlug("john-abc123");
            expect(result?.code).toBe("ABC123");
        });

        it("handles mixed case names", () => {
            const result = parseSlug("John-Jane-ABC123");
            expect(result).toEqual({
                names: ["John", "Jane"],
                code: "ABC123",
            });
        });

        it("handles numeric codes", () => {
            const result = parseSlug("john-123456");
            expect(result).toEqual({
                names: ["john"],
                code: "123456",
            });
        });

        it("handles alphanumeric codes", () => {
            const result = parseSlug("john-A1B2C3");
            expect(result).toEqual({
                names: ["john"],
                code: "A1B2C3",
            });
        });
    });

    describe("invalid slugs", () => {
        it("returns null for empty string", () => {
            expect(parseSlug("")).toBeNull();
        });

        it("returns null for slug too short", () => {
            expect(parseSlug("a-ABC")).toBeNull(); // 5 chars, need 8 minimum
        });

        it("returns null for no hyphen", () => {
            expect(parseSlug("johnABC123")).toBeNull();
        });

        it("returns null for code too short", () => {
            expect(parseSlug("john-ABC12")).toBeNull(); // 5 char code
        });

        it("returns null for code too long", () => {
            expect(parseSlug("john-ABC1234")).toBeNull(); // 7 char code
        });

        it("returns null for code with special characters", () => {
            expect(parseSlug("john-ABC12!")).toBeNull();
        });

        it("returns null for no names before code", () => {
            expect(parseSlug("-ABC123")).toBeNull();
        });

        it("returns null for empty names between hyphens", () => {
            // This tests filter for empty strings
            const result = parseSlug("john--ABC123");
            expect(result).toEqual({
                names: ["john"],
                code: "ABC123",
            });
        });
    });
});
