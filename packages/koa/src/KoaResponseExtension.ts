import type { Context } from 'koa';
import type { InertiaResponse } from '@inertianode/core';
import { Inertia, Headers, handleVersionChange, handleEmptyResponse, shouldChangeRedirectStatus } from '@inertianode/core';

// Helper function to convert Koa context to web Request
function koaContextToWebRequest(ctx: Context): Request {
    const protocol = ctx.protocol || 'http';
    const host = ctx.get('host') || 'localhost';
    const url = `${protocol}://${host}${ctx.originalUrl || ctx.url || '/'}`;
    const headers = new globalThis.Headers();

    // Copy headers from Koa context to web Request headers
    Object.entries(ctx.headers).forEach(([key, value]: [string, any]) => {
        if (value !== undefined) {
            headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
    });

    // GET and HEAD requests cannot have a body
    const requestInit: RequestInit = {
        method: ctx.method,
        headers,
    };

    // Only add body for methods that support it
    if (ctx.method !== 'GET' && ctx.method !== 'HEAD' && (ctx.request as any).body) {
        const requestBody = (ctx.request as any).body;
        requestInit.body = typeof requestBody === 'string' 
            ? requestBody 
            : JSON.stringify(requestBody);
    }

    return new Request(url, requestInit);
}

// Helper function to convert web Response headers to Koa headers
function setKoaHeaders(webResponse: Response, ctx: Context): void {
    webResponse.headers.forEach((value: string, key: string) => {
        ctx.set(key, value);
    });
}

// Extend InertiaResponse with Koa-specific methods
export class KoaInertiaResponse {
    private inertiaResponse: InertiaResponse;
    private koaContext: Context;

    constructor(inertiaResponse: InertiaResponse, koaContext: Context) {
        this.inertiaResponse = inertiaResponse;
        this.koaContext = koaContext;
    }

    /**
     * Send the Inertia response to a Koa context
     */
    async toResponse(ctx: Context): Promise<void> {
        const webRequest = koaContextToWebRequest(this.koaContext);
        const webResponse = await this.inertiaResponse.toResponse(webRequest);

        // Convert web Response headers to Koa headers
        setKoaHeaders(webResponse, ctx);

        // Get the response body as text
        const responseText = await webResponse.text();

        // Set the status
        ctx.status = webResponse.status;

        // Handle Inertia-specific logic after we have the response ready
        const didSend = await this.handleInertiaLogic(ctx, responseText);

        if (didSend) {
            return;
        }

        // Set the response body
        ctx.body = responseText;
    }

    /**
     * Handle Inertia-specific logic for the response
     */
    private async handleInertiaLogic(ctx: Context, responseContent?: string): Promise<boolean> {
        // Only process Inertia-specific logic for Inertia requests
        if (!ctx.get(Headers.INERTIA)) {
            return false;
        }

        // Set Vary header
        ctx.set('Vary', Headers.INERTIA);

        // Handle version changes - only if both client and server have versions
        const clientVersion = ctx.get(Headers.VERSION);
        const serverVersion = Inertia.getVersion();
        
        if (ctx.method === 'GET' && clientVersion && serverVersion && clientVersion !== serverVersion) {
            await this.handleVersionChange(ctx);
            return true;
        }

        // Handle empty responses - only redirect if we truly have no content
        if (ctx.status === 200 && (!responseContent || responseContent.length === 0)) {
            await this.handleEmptyResponse(ctx);
            return true;
        }

        // Handle redirects for PUT/PATCH/DELETE requests
        if (shouldChangeRedirectStatus(ctx.method, ctx.status)) {
            ctx.status = 303;
            return false; // Return false to let the response continue sending
        }

        return false;
    }

    /**
     * Handle version change responses
     */
    private async handleVersionChange(ctx: Context): Promise<void> {
        const locationResponse = handleVersionChange(ctx.url);

        // Set the headers from the Inertia response if it exists
        if (locationResponse && locationResponse.headers) {
            locationResponse.headers.forEach((value: string, key: string) => {
                ctx.set(key, value);
            });
        }

        ctx.status = locationResponse?.status || 409;
        ctx.body = '';
    }

    /**
     * Handle empty responses
     */
    private async handleEmptyResponse(ctx: Context): Promise<void> {
        // Redirect back to previous page
        const referer = ctx.get('Referer');
        if (referer) {
            ctx.redirect(referer);
        } else {
            // Fallback to home
            ctx.redirect('/');
        }
    }

    /**
     * Send the response to the provided Koa context
     * This is a convenience method that calls toResponse
     */
    async send(ctx: Context): Promise<void> {
        await this.toResponse(ctx);
    }

    /**
     * Get the underlying InertiaResponse for advanced usage
     */
    getInertiaResponse(): InertiaResponse {
        return this.inertiaResponse;
    }
}

// Create the Inertia property that will be added to Koa Context
export function createInertiaProperty(ctx: Context) {
    return {
        /**
         * Render a component and automatically send the response
         */
        async render(component: string, props: Record<string, any> = {}): Promise<void> {
            const inertiaResponse = Inertia.render(component, props);
            const koaInertiaResponse = new KoaInertiaResponse(inertiaResponse, ctx);
            await koaInertiaResponse.toResponse(ctx);
        },

        /**
         * Share data with all Inertia requests
         */
        share(key: string | Record<string, any>, value?: any): void {
            if (typeof key === 'object') {
                Inertia.share(key);
            } else {
                Inertia.share(key, value);
            }
        },

        /**
         * Set the version for asset versioning
         */
        setVersion(version: string | (() => string)): void {
            Inertia.setVersion(version);
        },

        /**
         * Get the current version
         */
        getVersion(): string | undefined {
            return Inertia.getVersion();
        },

        /**
         * Set the root view name
         */
        setRootView(rootView: string): void {
            Inertia.setRootView(rootView);
        },

        /**
         * Set Vite options for asset handling
         */
        setViteOptions(options: any): void {
            Inertia.setViteOptions(options);
        },

        /**
         * Create a location response (for redirects)
         */
        location(url: string): void {
            const locationResponse = Inertia.location(url);
            // Set the headers from the Inertia response if it exists
            if (locationResponse && locationResponse.headers) {
                locationResponse.headers.forEach((value: string, key: string) => {
                    ctx.set(key, value);
                });
                // Set status from the response
                ctx.status = locationResponse.status || 409;
            }
        }
    };
}

// Extend Koa Context type to include Inertia property
declare module 'koa' {
    interface Context {
        Inertia: ReturnType<typeof createInertiaProperty>;
    }
}