/**
 * Theme colours for the wedding website
 * These colours have been chosen to meet WCAG AA accessibility standards (4.5:1 contrast ratio on white backgrounds)
 */

// Primary theme colours
export const COLOURS = {
    // Brown theme colours
    PRIMARY: '#8b7355', // Original brown - use for buttons, icons, and backgrounds
    PRIMARY_DARK: '#6d5a44', // Darker brown - use for text on white backgrounds (WCAG AA compliant)
    PRIMARY_HOVER: '#6d5a44', // Hover state for buttons

    // Grey colours
    TEXT_PRIMARY: '#495057', // Dark grey for primary text (WCAG AA compliant)
    TEXT_SECONDARY: '#495057', // Same as primary for accessibility (was #6c757d)

    // Utility colours
    BACKGROUND_WHITE: '#ffffff',
    BACKGROUND_LIGHT: '#f8f9fa',
    BACKGROUND_MUTED: '#e9ecef',

    // Semantic colours
    SUCCESS: '#22c55e',
    ERROR: '#dc2626',
    WARNING: '#f59e0b',
    INFO: '#3b82f6',
} as const;

// Export individual colours for convenience
// Keep legacy 'colors' export name for backwards compatibility with American spelling in imports
export const COLORS = COLOURS;

// Individual exports
export const {
    PRIMARY,
    PRIMARY_DARK,
    PRIMARY_HOVER,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    BACKGROUND_WHITE,
    BACKGROUND_LIGHT,
    BACKGROUND_MUTED,
    SUCCESS,
    ERROR,
    WARNING,
    INFO,
} = COLOURS;
