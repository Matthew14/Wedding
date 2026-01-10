/**
 * Fetch with timeout support.
 * Wraps the native fetch API with an AbortController that times out after the specified duration.
 *
 * @param url - The URL to fetch
 * @param options - Standard fetch options, plus optional timeout
 * @param timeout - Timeout in milliseconds (default: 10000ms / 10 seconds)
 * @returns Promise that resolves to the Response or rejects on timeout/error
 *
 * @example
 * const response = await fetchWithTimeout('/api/data', { method: 'GET' }, 5000);
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = 10000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Error type guard to check if an error is an AbortError (timeout or manual abort)
 */
export function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
}

/**
 * Default timeout values for different types of requests
 */
export const FETCH_TIMEOUTS = {
    /** Quick validation requests */
    VALIDATION: 5000,
    /** Form submissions and data fetches */
    STANDARD: 10000,
    /** Longer operations */
    EXTENDED: 30000,
} as const;
