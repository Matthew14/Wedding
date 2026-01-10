/**
 * Shared utilities and types for invitation page and API
 */

/**
 * Parsed invitation slug containing guest names and invitation code
 */
export interface ParsedSlug {
    /** Guest first names extracted from the URL */
    names: string[];
    /** 6-character alphanumeric invitation code (uppercased) */
    code: string;
}

/**
 * Invitation data returned from the API
 */
export interface InvitationData {
    /** Whether the invitation is valid */
    valid: boolean;
    /** 6-character invitation code */
    code: string;
    /** Array of guest first names */
    guestNames: string[];
    /** UUID of the invitation record */
    invitationId: string;
}

/**
 * Format guest names for display.
 *
 * @param names - Array of guest first names
 * @returns Formatted string for display
 *
 * @example
 * formatGuestNames(["John"]) // "John"
 * formatGuestNames(["John", "Jane"]) // "John & Jane"
 * formatGuestNames(["John", "Jane", "Bob"]) // "John, Jane & Bob"
 */
export function formatGuestNames(names: string[]): string {
    if (names.length === 0) {
        return "";
    }
    if (names.length === 1) {
        return names[0];
    }
    if (names.length === 2) {
        return `${names[0]} & ${names[1]}`;
    }
    return names.slice(0, -1).join(", ") + " & " + names[names.length - 1];
}

/**
 * Parse invitation slug to extract guest names and invitation code.
 *
 * The slug format is: `name-name-CODE` or `name-CODE`
 * where CODE is always the last 6 alphanumeric characters.
 *
 * @param slug - The URL slug to parse (e.g., "john-jane-ABC123")
 * @returns Parsed names and uppercase code, or null if invalid
 *
 * @example
 * parseSlug("john-jane-ABC123") // { names: ["john", "jane"], code: "ABC123" }
 * parseSlug("invalid") // null
 */
export function parseSlug(slug: string): ParsedSlug | null {
    // Slug must be at least 8 chars: 1 char name + hyphen + 6 char code
    if (!slug || slug.length < 8) {
        return null;
    }

    const parts = slug.split("-");
    if (parts.length < 2) {
        return null;
    }

    // The last part should be the 6-character alphanumeric code
    const code = parts[parts.length - 1];
    if (code.length !== 6 || !/^[A-Za-z0-9]+$/.test(code)) {
        return null;
    }

    // Everything before the code is the names
    const names = parts.slice(0, -1).filter((name) => name.length > 0);
    if (names.length === 0) {
        return null;
    }

    return { names, code: code.toUpperCase() };
}
