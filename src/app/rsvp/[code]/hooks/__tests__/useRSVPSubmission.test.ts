import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRSVPSubmission } from '../useRSVPSubmission';
import { RSVPFormData } from '@/types';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

// Mock the tracking hooks
vi.mock('@/hooks', () => ({
    useTracking: () => ({
        trackEvent: vi.fn(),
        setUserProperties: vi.fn(),
    }),
    useFormAnalytics: () => ({
        trackFormSubmission: vi.fn(),
    }),
    RSVPEvents: {
        SUBMIT_ATTEMPT: 'rsvp_submit_attempt',
        SUBMIT_SUCCESS: 'rsvp_submit_success',
        SUBMIT_ERROR: 'rsvp_submit_error',
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

const createMockFormValues = (overrides?: Partial<RSVPFormData>): RSVPFormData => ({
    accepted: true,
    invitees: [
        { id: '1', name: 'John Doe', coming: true },
        { id: '2', name: 'Jane Doe', coming: true },
    ],
    staying_villa: 'yes',
    dietary_restrictions: 'Vegetarian',
    song_request: 'Bohemian Rhapsody',
    travel_plans: 'Flying in from Dublin',
    message: 'Looking forward to it!',
    ...overrides,
});

describe('useRSVPSubmission', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useRSVPSubmission({ code: 'TEST01' }));

        expect(result.current.submitting).toBe(false);
        expect(result.current.success).toBe(false);
        expect(result.current.error).toBe('');
        expect(typeof result.current.handleSubmit).toBe('function');
        expect(typeof result.current.clearError).toBe('function');
    });

    it('should submit RSVP successfully', async () => {
        mockFetchWithTimeout.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true }),
        } as Response);

        const { result } = renderHook(() => useRSVPSubmission({ code: 'TEST01' }));
        const formValues = createMockFormValues();

        await act(async () => {
            await result.current.handleSubmit(formValues);
        });

        await waitFor(() => {
            expect(result.current.success).toBe(true);
        });

        expect(result.current.error).toBe('');
        // Note: submitting stays true on success because redirect happens shortly after
        expect(result.current.submitting).toBe(true);
    });

    it('should redirect after successful submission', async () => {
        vi.useFakeTimers();

        mockFetchWithTimeout.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true }),
        } as Response);

        const { result } = renderHook(() => useRSVPSubmission({ code: 'TEST01' }));
        const formValues = createMockFormValues({ accepted: true });

        await act(async () => {
            await result.current.handleSubmit(formValues);
        });

        expect(result.current.success).toBe(true);

        // Advance timer for the redirect timeout
        await act(async () => {
            vi.advanceTimersByTime(500);
        });

        expect(mockPush).toHaveBeenCalledWith('/rsvp/success?accepted=yes&code=TEST01');

        vi.useRealTimers();
    });

    it('should redirect with accepted=no when declining', async () => {
        vi.useFakeTimers();

        mockFetchWithTimeout.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true }),
        } as Response);

        const { result } = renderHook(() => useRSVPSubmission({ code: 'TEST01' }));
        const formValues = createMockFormValues({ accepted: false });

        await act(async () => {
            await result.current.handleSubmit(formValues);
        });

        expect(result.current.success).toBe(true);

        await act(async () => {
            vi.advanceTimersByTime(500);
        });

        expect(mockPush).toHaveBeenCalledWith('/rsvp/success?accepted=no&code=TEST01');

        vi.useRealTimers();
    });

    it('should handle API error response', async () => {
        mockFetchWithTimeout.mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'Invalid invitation code' }),
        } as Response);

        const { result } = renderHook(() => useRSVPSubmission({ code: 'INVALID' }));
        const formValues = createMockFormValues();

        await act(async () => {
            result.current.handleSubmit(formValues);
        });

        await waitFor(() => {
            expect(result.current.submitting).toBe(false);
        });

        expect(result.current.error).toBe('Invalid invitation code');
        expect(result.current.success).toBe(false);
    });

    it('should handle 207 Multi-Status (partial failure)', async () => {
        mockFetchWithTimeout.mockResolvedValue({
            ok: false,
            status: 207,
            json: () => Promise.resolve({
                warning: 'Some guests could not be updated',
                failedInviteeIds: ['2'],
            }),
        } as Response);

        const { result } = renderHook(() => useRSVPSubmission({ code: 'TEST01' }));
        const formValues = createMockFormValues();

        await act(async () => {
            result.current.handleSubmit(formValues);
        });

        await waitFor(() => {
            expect(result.current.submitting).toBe(false);
        });

        expect(result.current.error).toBe('Some guests could not be updated');
        expect(result.current.success).toBe(false);
    });

    it('should handle timeout error', async () => {
        const timeoutError = new Error('Timeout');
        timeoutError.name = 'AbortError';
        mockFetchWithTimeout.mockRejectedValue(timeoutError);

        const { result } = renderHook(() => useRSVPSubmission({ code: 'TEST01' }));
        const formValues = createMockFormValues();

        await act(async () => {
            result.current.handleSubmit(formValues);
        });

        await waitFor(() => {
            expect(result.current.submitting).toBe(false);
        });

        expect(result.current.error).toBe('Request timed out. Please check your connection and try again.');
        expect(result.current.success).toBe(false);
    });

    it('should handle network error', async () => {
        mockFetchWithTimeout.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useRSVPSubmission({ code: 'TEST01' }));
        const formValues = createMockFormValues();

        await act(async () => {
            result.current.handleSubmit(formValues);
        });

        await waitFor(() => {
            expect(result.current.submitting).toBe(false);
        });

        expect(result.current.error).toBe('Something went wrong. Please try again.');
        expect(result.current.success).toBe(false);
    });

    it('should clear error with clearError function', async () => {
        mockFetchWithTimeout.mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'Some error' }),
        } as Response);

        const { result } = renderHook(() => useRSVPSubmission({ code: 'TEST01' }));
        const formValues = createMockFormValues();

        await act(async () => {
            result.current.handleSubmit(formValues);
        });

        await waitFor(() => {
            expect(result.current.error).toBe('Some error');
        });

        act(() => {
            result.current.clearError();
        });

        expect(result.current.error).toBe('');
    });

    it('should set submitting state during request', async () => {
        let resolvePromise: (value: Response) => void;
        const pendingPromise = new Promise<Response>((resolve) => {
            resolvePromise = resolve;
        });
        mockFetchWithTimeout.mockReturnValue(pendingPromise);

        const { result } = renderHook(() => useRSVPSubmission({ code: 'TEST01' }));
        const formValues = createMockFormValues();

        // Start the submission (don't await)
        let submitPromise: Promise<void>;
        act(() => {
            submitPromise = result.current.handleSubmit(formValues);
        });

        // Should be submitting while request is pending
        expect(result.current.submitting).toBe(true);

        // Resolve the fetch promise and wait for submission to complete
        await act(async () => {
            resolvePromise!({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ success: true }),
            } as Response);
            await submitPromise;
        });

        // On success, submitting stays true (redirect handles navigation)
        expect(result.current.submitting).toBe(true);
        expect(result.current.success).toBe(true);
    });

    it('should send correct request body', async () => {
        mockFetchWithTimeout.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ success: true }),
        } as Response);

        const { result } = renderHook(() => useRSVPSubmission({ code: 'TEST01' }));
        const formValues = createMockFormValues();

        await act(async () => {
            result.current.handleSubmit(formValues);
        });

        expect(mockFetchWithTimeout).toHaveBeenCalledWith(
            '/api/rsvp/TEST01',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formValues),
            }),
            10000 // FETCH_TIMEOUTS.STANDARD
        );
    });

    it('should use default error message when API returns no error field', async () => {
        mockFetchWithTimeout.mockResolvedValue({
            ok: false,
            status: 500,
            json: () => Promise.resolve({}),
        } as Response);

        const { result } = renderHook(() => useRSVPSubmission({ code: 'TEST01' }));
        const formValues = createMockFormValues();

        await act(async () => {
            result.current.handleSubmit(formValues);
        });

        await waitFor(() => {
            expect(result.current.error).toBe('Failed to submit RSVP');
        });
    });
});
