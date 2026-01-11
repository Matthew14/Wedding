import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRSVPData } from '../useRSVPData';
import { UseFormReturnType } from '@mantine/form';
import { RSVPFormData } from '@/types';

// Mock the tracking hooks
vi.mock('@/hooks', () => ({
    useTracking: () => ({
        trackEvent: vi.fn(),
        identifyUser: vi.fn(),
        setGroup: vi.fn(),
    }),
    RSVPEvents: {
        FORM_VIEWED: 'rsvp_form_viewed',
        FORM_AMENDMENT: 'rsvp_form_amendment',
        FORM_LOAD_ERROR: 'rsvp_form_load_error',
    },
}));

// Mock fetchWithTimeout
vi.mock('@/utils/fetchWithTimeout', () => ({
    fetchWithTimeout: vi.fn(),
    isAbortError: (err: unknown) => err instanceof Error && err.name === 'AbortError',
    FETCH_TIMEOUTS: {
        VALIDATION: 5000,
        STANDARD: 10000,
        EXTENDED: 30000,
    },
}));

import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

// Create a mock form object
const createMockForm = (): UseFormReturnType<RSVPFormData> => ({
    values: {
        accepted: true,
        invitees: [],
        staying_villa: 'no',
        dietary_restrictions: '',
        song_request: '',
        travel_plans: '',
        message: '',
    },
    setValues: vi.fn(),
    setFieldValue: vi.fn(),
    getInputProps: vi.fn(),
    onSubmit: vi.fn(),
    validate: vi.fn(),
    validateField: vi.fn(),
    reset: vi.fn(),
    resetDirty: vi.fn(),
    resetTouched: vi.fn(),
    setFieldError: vi.fn(),
    clearFieldError: vi.fn(),
    clearErrors: vi.fn(),
    setErrors: vi.fn(),
    setTouched: vi.fn(),
    setDirty: vi.fn(),
    isTouched: vi.fn(),
    isDirty: vi.fn(),
    errors: {},
    isValid: vi.fn(),
    reorderListItem: vi.fn(),
    insertListItem: vi.fn(),
    removeListItem: vi.fn(),
    replaceListItem: vi.fn(),
    getTransformedValues: vi.fn(),
    initialized: true,
    key: vi.fn(),
} as unknown as UseFormReturnType<RSVPFormData>);

describe('useRSVPData', () => {
    let mockForm: UseFormReturnType<RSVPFormData>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockForm = createMockForm();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with loading state', () => {
        mockFetchWithTimeout.mockImplementation(() => new Promise(() => {})); // Never resolves

        const { result } = renderHook(() => useRSVPData({ code: 'TEST01', form: mockForm }));

        expect(result.current.loading).toBe(true);
        expect(result.current.error).toBe('');
        expect(result.current.guestNames).toBe('');
    });

    it('should load RSVP data successfully for new user', async () => {
        const mockData = {
            invitees: [
                { id: '1', first_name: 'John', last_name: 'Doe', is_primary: true },
                { id: '2', first_name: 'Jane', last_name: 'Doe', is_primary: false },
            ],
            accepted: true,
            rsvpId: 'rsvp-1',
            invitationId: 'inv-1',
            stayingVilla: false,
            dietaryRestrictions: '',
            songRequest: '',
            travelPlans: '',
            message: '',
            updatedAt: null,
            villaOffered: true,
        };

        mockFetchWithTimeout.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData),
        } as Response);

        const { result } = renderHook(() => useRSVPData({ code: 'TEST01', form: mockForm }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('');
        expect(result.current.guestNames).toBe('John & Jane Doe');
        expect(result.current.villaOffered).toBe(true);
        expect(result.current.originalValues).toBeNull();
        expect(result.current.infoText).toBe('');
    });

    it('should format guest names with smart surname grouping', async () => {
        const mockData = {
            invitees: [
                { id: '1', first_name: 'John', last_name: 'Doe', is_primary: true },
                { id: '2', first_name: 'Jane', last_name: 'Smith', is_primary: false },
            ],
            accepted: true,
            rsvpId: 'rsvp-1',
            invitationId: 'inv-1',
            stayingVilla: false,
            dietaryRestrictions: '',
            songRequest: '',
            travelPlans: '',
            message: '',
            updatedAt: null,
            villaOffered: true,
        };

        mockFetchWithTimeout.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData),
        } as Response);

        const { result } = renderHook(() => useRSVPData({ code: 'TEST01', form: mockForm }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.guestNames).toBe('John Doe & Jane Smith');
    });

    it('should load RSVP data for returning user (amendment)', async () => {
        const mockData = {
            invitees: [
                { id: '1', first_name: 'John', last_name: 'Doe', is_primary: true, coming: true },
            ],
            accepted: true,
            rsvpId: 'rsvp-1',
            invitationId: 'inv-1',
            stayingVilla: true,
            dietaryRestrictions: 'Vegetarian',
            songRequest: 'Bohemian Rhapsody',
            travelPlans: 'Flying in',
            message: 'Looking forward!',
            updatedAt: '2026-01-10T12:00:00Z',
            villaOffered: true,
        };

        mockFetchWithTimeout.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData),
        } as Response);

        const { result } = renderHook(() => useRSVPData({ code: 'TEST01', form: mockForm }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.infoText).toContain("You're amending your RSVP");
        expect(result.current.originalValues).not.toBeNull();
        expect(result.current.originalValues?.accepted).toBe(true);
        expect(result.current.originalValues?.dietary_restrictions).toBe('Vegetarian');
    });

    it('should handle API error response', async () => {
        mockFetchWithTimeout.mockResolvedValue({
            ok: false,
            status: 404,
        } as Response);

        const { result } = renderHook(() => useRSVPData({ code: 'INVALID', form: mockForm }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('Failed to load RSVP data');
    });

    it('should handle timeout error', async () => {
        const timeoutError = new Error('Timeout');
        timeoutError.name = 'AbortError';
        mockFetchWithTimeout.mockRejectedValue(timeoutError);

        const { result } = renderHook(() => useRSVPData({ code: 'TEST01', form: mockForm }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('Request timed out. Please check your connection and try again.');
    });

    it('should handle network error', async () => {
        mockFetchWithTimeout.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useRSVPData({ code: 'TEST01', form: mockForm }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('Something went wrong while loading the form');
    });

    it('should set villa to "no" when villa not offered', async () => {
        const mockData = {
            invitees: [
                { id: '1', first_name: 'John', last_name: 'Doe', is_primary: true },
            ],
            accepted: true,
            rsvpId: 'rsvp-1',
            invitationId: 'inv-1',
            stayingVilla: false,
            dietaryRestrictions: '',
            songRequest: '',
            travelPlans: '',
            message: '',
            updatedAt: null,
            villaOffered: false,
        };

        mockFetchWithTimeout.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData),
        } as Response);

        const { result } = renderHook(() => useRSVPData({ code: 'TEST01', form: mockForm }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.villaOffered).toBe(false);
        expect(mockForm.setFieldValue).toHaveBeenCalledWith('staying_villa', 'no');
    });

    it('should not fetch if code is empty', async () => {
        const { result } = renderHook(() => useRSVPData({ code: '', form: mockForm }));

        // Give it a moment to potentially fetch
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockFetchWithTimeout).not.toHaveBeenCalled();
        expect(result.current.loading).toBe(true);
    });

    it('should default villaOffered to true when not in response', async () => {
        const mockData = {
            invitees: [
                { id: '1', first_name: 'John', last_name: 'Doe', is_primary: true },
            ],
            accepted: true,
            rsvpId: 'rsvp-1',
            invitationId: 'inv-1',
            stayingVilla: false,
            dietaryRestrictions: '',
            songRequest: '',
            travelPlans: '',
            message: '',
            updatedAt: null,
            // villaOffered not included
        };

        mockFetchWithTimeout.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData),
        } as Response);

        const { result } = renderHook(() => useRSVPData({ code: 'TEST01', form: mockForm }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.villaOffered).toBe(true);
    });
});
