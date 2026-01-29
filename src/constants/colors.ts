/**
 * Color constants
 * These match the Mantine theme colors defined in layout.tsx
 * Use these for non-Mantine contexts; prefer theme.colors or theme.other for Mantine components
 */

export const COLORS = {
    /** Primary gold color - matches theme.colors.gold[4] */
    gold: '#8b7355',
    /** Darker gold - matches theme.colors.gold[5] and theme.other.goldDark */
    goldDark: '#6d5a44',
    /** Primary text color - matches theme.other.textPrimary */
    textPrimary: '#2d2d2d',
    /** Secondary text color - matches theme.other.textSecondary */
    textSecondary: '#5a5a5a',
} as const;

export type ColorKey = keyof typeof COLORS;
