import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithTimeout, isAbortError, FETCH_TIMEOUTS } from '../fetchWithTimeout';

describe('fetchWithTimeout', () => {
    // Suppress unhandled rejection warnings for abort tests
    const originalOnUnhandledRejection = process.listeners('unhandledRejection');

    beforeEach(() => {
        vi.useFakeTimers();
        // Temporarily ignore unhandled rejections (expected in abort tests)
        process.removeAllListeners('unhandledRejection');
        process.on('unhandledRejection', () => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        // Restore original handlers
        process.removeAllListeners('unhandledRejection');
        originalOnUnhandledRejection.forEach(listener => {
            process.on('unhandledRejection', listener as NodeJS.UnhandledRejectionListener);
        });
    });

    it('should return response when fetch completes before timeout', async () => {
        const mockResponse = new Response(JSON.stringify({ data: 'test' }), { status: 200 });
        vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

        const responsePromise = fetchWithTimeout('/api/test', {}, 5000);

        // Advance timers but not past timeout
        await vi.advanceTimersByTimeAsync(100);

        const response = await responsePromise;
        expect(response).toBe(mockResponse);
        expect(response.status).toBe(200);
    });

    it('should abort when timeout is reached', async () => {
        // Create a fetch that rejects when aborted
        vi.spyOn(global, 'fetch').mockImplementation(
            (_url, options) =>
                new Promise((_, reject) => {
                    const signal = options?.signal;
                    if (signal?.aborted) {
                        const error = new Error('The operation was aborted');
                        error.name = 'AbortError';
                        reject(error);
                        return;
                    }
                    signal?.addEventListener('abort', () => {
                        const error = new Error('The operation was aborted');
                        error.name = 'AbortError';
                        reject(error);
                    });
                })
        );

        const responsePromise = fetchWithTimeout('/api/slow', {}, 5000);

        // Advance past timeout
        await vi.advanceTimersByTimeAsync(5001);

        await expect(responsePromise).rejects.toThrow('The operation was aborted');
    });

    it('should use default timeout of 10000ms when not specified', async () => {
        const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(
            (_url, options) =>
                new Promise((_, reject) => {
                    const signal = options?.signal;
                    if (signal?.aborted) {
                        const error = new Error('The operation was aborted');
                        error.name = 'AbortError';
                        reject(error);
                        return;
                    }
                    signal?.addEventListener('abort', () => {
                        const error = new Error('The operation was aborted');
                        error.name = 'AbortError';
                        reject(error);
                    });
                })
        );

        const responsePromise = fetchWithTimeout('/api/test');

        // Should not abort at 9999ms
        await vi.advanceTimersByTimeAsync(9999);
        expect(fetchSpy).toHaveBeenCalled();

        // Should abort at 10001ms
        await vi.advanceTimersByTimeAsync(2);

        await expect(responsePromise).rejects.toThrow('The operation was aborted');
    });

    it('should pass options to fetch', async () => {
        const mockResponse = new Response('ok', { status: 200 });
        const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true }),
        };

        await fetchWithTimeout('/api/test', options, 5000);

        expect(fetchSpy).toHaveBeenCalledWith('/api/test', expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true }),
            signal: expect.any(AbortSignal),
        }));
    });

    it('should clear timeout after successful fetch', async () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
        const mockResponse = new Response('ok', { status: 200 });
        vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

        await fetchWithTimeout('/api/test', {}, 5000);

        expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear timeout even when fetch fails', async () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
        vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

        await expect(fetchWithTimeout('/api/test', {}, 5000)).rejects.toThrow('Network error');

        expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should propagate non-timeout errors', async () => {
        const networkError = new Error('Network error');
        vi.spyOn(global, 'fetch').mockRejectedValue(networkError);

        await expect(fetchWithTimeout('/api/test', {}, 5000)).rejects.toThrow('Network error');
    });
});

describe('isAbortError', () => {
    it('should return true for AbortError', () => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';

        expect(isAbortError(error)).toBe(true);
    });

    it('should return false for other errors', () => {
        const error = new Error('Network error');

        expect(isAbortError(error)).toBe(false);
    });

    it('should return false for non-Error objects', () => {
        expect(isAbortError('string error')).toBe(false);
        expect(isAbortError(null)).toBe(false);
        expect(isAbortError(undefined)).toBe(false);
        expect(isAbortError({ message: 'error' })).toBe(false);
    });
});

describe('FETCH_TIMEOUTS', () => {
    it('should have correct timeout values', () => {
        expect(FETCH_TIMEOUTS.VALIDATION).toBe(5000);
        expect(FETCH_TIMEOUTS.STANDARD).toBe(10000);
        expect(FETCH_TIMEOUTS.EXTENDED).toBe(30000);
    });

    it('should be immutable (as const)', () => {
        // TypeScript enforces this at compile time, but we can verify the values exist
        expect(Object.keys(FETCH_TIMEOUTS)).toEqual(['VALIDATION', 'STANDARD', 'EXTENDED']);
    });
});
