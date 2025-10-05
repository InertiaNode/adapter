import type { Context } from 'hono';
import type { InertiaResponse } from '@inertianode/core';
import { InertiaResponseFactory, Headers, handleVersionChange, handleEmptyResponse, shouldChangeRedirectStatus } from '@inertianode/core';

// Helper function to convert Hono context to web Request
function honoContextToWebRequest(c: Context): Request {
    return c.req.raw;
}

// Helper function to convert web Response headers to Hono headers
function setHonoHeaders(webResponse: Response, c: Context): void {
    webResponse.headers.forEach((value: string, key: string) => {
        c.header(key, value);
    });
}

// Extend InertiaResponse with Hono-specific methods
export class HonoInertiaResponse {
    private inertiaResponse: InertiaResponse;
    private honoContext: Context;

    constructor(inertiaResponse: InertiaResponse, honoContext: Context) {
        this.inertiaResponse = inertiaResponse;
        this.honoContext = honoContext;
    }

    /**
     * Send the Inertia response to a Hono context
     */
    async toResponse(c: Context): Promise<Response> {
        const webRequest = honoContextToWebRequest(this.honoContext);
        const webResponse = await this.inertiaResponse.toResponse(webRequest);

        // Convert web Response headers to Hono headers
        setHonoHeaders(webResponse, c);

        // Get the response body as text
        const responseText = await webResponse.text();

        // Handle Inertia-specific logic
        const customResponse = await this.handleInertiaLogic(c, responseText, webResponse.status);
        if (customResponse) {
            return customResponse;
        }

        // Return the response
        return new Response(responseText, {
            status: webResponse.status,
            headers: webResponse.headers
        });
    }

    /**
     * Handle Inertia-specific logic for the response
     */
    private async handleInertiaLogic(c: Context, responseContent?: string, status?: number): Promise<Response | null> {
        // Only process Inertia-specific logic for Inertia requests
        if (!c.req.header(Headers.INERTIA)) {
            return null;
        }

        // Set Vary header
        c.header('Vary', Headers.INERTIA);

        // Handle version changes - only if both client and server have versions
        const clientVersion = c.req.header(Headers.VERSION);

        // Get the version from the per-request Inertia instance
        const inertiaInstance = (c as any).__inertia as InertiaResponseFactory;
        const serverVersion = inertiaInstance?.getVersion();

        if (c.req.method === 'GET' && clientVersion && serverVersion && clientVersion !== serverVersion) {
            return await this.handleVersionChange(c);
        }

        // Handle empty responses - only redirect if we truly have no content
        if (status === 200 && (!responseContent || responseContent.length === 0)) {
            return await this.handleEmptyResponse(c);
        }

        // Handle redirects for PUT/PATCH/DELETE requests
        if (shouldChangeRedirectStatus(c.req.method, status || 200)) {
            // Status change will be handled by the caller
            return null;
        }

        return null;
    }

    /**
     * Handle version change responses
     */
    private async handleVersionChange(c: Context): Promise<Response> {
        const locationResponse = handleVersionChange(c.req.url);

        // Set the headers from the Inertia response if it exists
        if (locationResponse && locationResponse.headers) {
            locationResponse.headers.forEach((value: string, key: string) => {
                c.header(key, value);
            });
        }

        return new Response('', {
            status: locationResponse?.status || 409,
            headers: locationResponse?.headers
        });
    }

    /**
     * Handle empty responses
     */
    private async handleEmptyResponse(c: Context): Promise<Response> {
        // Redirect back to previous page
        const referer = c.req.header('Referer');
        const redirectUrl = referer || '/';

        return c.redirect(redirectUrl, 302);
    }

    /**
     * Send the response to the provided Hono context
     * This is a convenience method that calls toResponse
     */
    async send(c: Context): Promise<Response> {
        return await this.toResponse(c);
    }

    /**
     * Get the underlying InertiaResponse for advanced usage
     */
    getInertiaResponse(): InertiaResponse {
        return this.inertiaResponse;
    }
}

// Create the Inertia property that will be added to Hono Context
export function createInertiaProperty(c: Context) {
    // Create a per-request Inertia instance
    const inertiaInstance = new InertiaResponseFactory();

    // Copy global configuration to the per-request instance
    if (Inertia.getVersion()) {
        inertiaInstance.setVersion(Inertia.getVersion());
    }

    // Copy other global settings
    if ((Inertia as any).rootView) {
        inertiaInstance.setRootView((Inertia as any).rootView);
    }

    if ((Inertia as any).viteOptions) {
        inertiaInstance.setViteOptions((Inertia as any).viteOptions);
    }

    if ((Inertia as any).renderer) {
        inertiaInstance.setRenderer((Inertia as any).renderer);
    }

    if ((Inertia as any).urlResolver) {
        inertiaInstance.resolveUrlUsing((Inertia as any).urlResolver);
    }

    // Store it on the context for later retrieval
    (c as any).__inertia = inertiaInstance;

    const methods = {
        /**
         * Render a component and automatically send the response
         */
        async render(component: string, props: Record<string, any> = {}): Promise<Response> {
            const inertiaResponse = inertiaInstance.render(component, props);
            const honoInertiaResponse = new HonoInertiaResponse(inertiaResponse, c);
            return await honoInertiaResponse.toResponse(c);
        },

        /**
         * Share data with all Inertia requests (scoped to this request)
         */
        share(key: string | Record<string, any>, value?: any): void {
            if (typeof key === 'object') {
                inertiaInstance.share(key);
            } else {
                inertiaInstance.share(key, value);
            }
        },

        /**
         * Set the version for asset versioning
         */
        setVersion(version: string | (() => string)): void {
            inertiaInstance.setVersion(version);
        },

        /**
         * Get the current version
         */
        getVersion(): string | undefined {
            return inertiaInstance.getVersion();
        },

        /**
         * Set the root view name
         */
        setRootView(rootView: string): void {
            inertiaInstance.setRootView(rootView);
        },

        /**
         * Set Vite options for asset handling
         */
        setViteOptions(options: any): void {
            inertiaInstance.setViteOptions(options);
        },

        /**
         * Create a location response (for redirects)
         */
        location(url: string): Response {
            const locationResponse = inertiaInstance.location(url);
            // Return the response with proper headers
            return new Response('', {
                status: locationResponse.status || 409,
                headers: locationResponse.headers
            });
        },

        /**
         * Redirect back to the previous page (referer) or to a fallback URL
         */
        back(fallbackUrl: string = '/'): Response {
            const referer = c.req.header('Referer');
            return c.redirect(referer || fallbackUrl, 303);
        },

        /**
         * Clear the history state
         */
        clearHistory(): void {
            inertiaInstance.clearHistory();
        },

        /**
         * Encrypt the history state
         */
        encryptHistory(encrypt: boolean = true): void {
            inertiaInstance.encryptHistory(encrypt);
        }
    };

    // Create a callable function that also has methods attached
    const callable = async function(component: string, props?: Record<string, any>): Promise<Response> {
        return methods.render(component, props || {});
    };

    // Attach all methods to the callable function
    Object.assign(callable, methods);

    type InertiaCallable = typeof methods & {
        (component: string, props?: Record<string, any>): Promise<Response>;
    };

    return callable as InertiaCallable;
}

// Extend Hono Context type to include Inertia property
declare module 'hono' {
    interface Context {
        Inertia: ReturnType<typeof createInertiaProperty>;
    }
}
