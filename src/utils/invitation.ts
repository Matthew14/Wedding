/**
 * Shared utilities for invitation page and API
 */

/**
 * Format guest names for display
 * - 1 guest: "John"
 * - 2 guests: "John & Jane"
 * - 3+ guests: "John, Jane & Bob"
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

export interface ParsedSlug {
    names: string[];
    code: string;
}

/**
 * Parse invitation slug to extract names and code
 * Format: name-name-CODE or name-CODE
 * The code is always the last 6 alphanumeric characters
 *
 * @returns Parsed names and code, or null if invalid
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
