import { Headers, Inertia } from './index.js';

/**
 * Interface for request context that adapters can implement
 * This allows the core logic to work with different frameworks
 */
export interface RequestContext {
    method: string;
    url: string;
    headers: Record<string, string>;
    getHeader(name: string): string | undefined;
    setHeader(name: string, value: string): void;
    setStatus(status: number): void;
    redirect(url: string, status?: number): void;
}

/**
 * Handle Inertia-specific request logic
 * This normalizes the request handling logic that was previously duplicated across adapters
 */
export function handleInertiaRequest(
    context: RequestContext,
    getVersion: () => string
): boolean {
    // Set Vary header
    context.setHeader('Vary', Headers.INERTIA);

    // Only process Inertia-specific logic for Inertia requests
    if (!context.getHeader(Headers.INERTIA)) {
        return false;
    }

    // Handle version changes
    if (context.method === 'GET' &&
        context.getHeader(Headers.VERSION) !== getVersion()) {
        return true; // Signal that version change was handled
    }

    return false;
}

/**
 * Handle version change responses
 */
export function handleVersionChange(url: string): Response {
    return Inertia.location(url);
}

/**
 * Handle empty responses by returning Inertia location response
 */
export function handleEmptyResponse(referer?: string): Response {
    const location = referer || '/';
    return Inertia.location(location);
}

/**
 * Check if a redirect should be changed from 302 to 303 for certain HTTP methods
 */
export function shouldChangeRedirectStatus(method: string, status: number): boolean {
    return status === 302 && ['PUT', 'PATCH', 'DELETE'].includes(method);
}
