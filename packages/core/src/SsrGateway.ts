import type { Page, SsrResponse, SsrOptions } from './types.js';

/**
 * SSR Gateway for dispatching Inertia pages to the SSR server
 * Similar to Laravel's Inertia SSR Gateway
 */
export class SsrGateway {
    private static defaultUrl = 'http://127.0.0.1:13714/render';

    /**
     * Dispatch an Inertia page to the SSR server
     * @param page - The Inertia page object
     * @param options - SSR configuration options
     * @returns SSR response with head and body content, or null if SSR fails
     */
    static async dispatch(page: Page, options: SsrOptions): Promise<SsrResponse | null> {
        if (!options.enabled) {
            return null;
        }

        const url = options.url || this.defaultUrl;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(page),
            });

            if (!response.ok) {
                console.error(`SSR server returned ${response.status}: ${response.statusText}`);
                return null;
            }

            const data = await response.json();

            // The SSR server should return { head: string[], body: string }
            if (!data || typeof data.body !== 'string') {
                console.error('Invalid SSR response format');
                return null;
            }

            return {
                head: Array.isArray(data.head) ? data.head : [],
                body: data.body,
            };
        } catch (error) {
            console.error('Failed to dispatch SSR request:', error);
            return null;
        }
    }
}
