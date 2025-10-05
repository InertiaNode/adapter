import type { Response as ExpressResponse } from 'express';
import type { InertiaResponse } from '@inertianode/core';
import { Inertia, InertiaResponseFactory, Headers, handleVersionChange, handleEmptyResponse, shouldChangeRedirectStatus } from '@inertianode/core';

// Helper function to convert Express request to web Request
function expressRequestToWebRequest(req: any): Request {
    const protocol = req.protocol || 'http';
    const host = (req.get && req.get('host')) || 'localhost';
    const url = `${protocol}://${host}${req.originalUrl || req.url || '/'}`;
    const headers = new globalThis.Headers();

    // Copy headers from Express request to web Request headers
    if (req.headers && typeof req.headers === 'object') {
        Object.entries(req.headers).forEach(([key, value]: [string, any]) => {
            if (value !== undefined) {
                headers.set(key, Array.isArray(value) ? value.join(', ') : value);
            }
        });
    }

    // GET and HEAD requests cannot have a body
    const requestInit: RequestInit = {
        method: req.method,
        headers,
    };

    // Only add body for methods that support it
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        requestInit.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    return new Request(url, requestInit);
}

// Helper function to convert web Response headers to Express headers
function setExpressHeaders(webResponse: Response, expressResponse: ExpressResponse): void {
    webResponse.headers.forEach((value: string, key: string) => {
        expressResponse.setHeader(key, value);
    });
}

// Extend InertiaResponse with NestJS-specific methods
export class NestJSInertiaResponse {
    private inertiaResponse: InertiaResponse;
    private request: any;

    constructor(inertiaResponse: InertiaResponse, request: any) {
        this.inertiaResponse = inertiaResponse;
        this.request = request;
    }

    /**
     * Send the Inertia response to a NestJS response object
     */
    async toResponse(res: ExpressResponse): Promise<void> {
        const webRequest = expressRequestToWebRequest(this.request);
        const webResponse = await this.inertiaResponse.toResponse(webRequest);

        // Convert web Response headers to Express headers
        setExpressHeaders(webResponse, res);

        // Get the response body as text
        const responseText = await webResponse.text();

        // Set the status
        res.status(webResponse.status);

        // Handle Inertia-specific logic after we have the response ready
        const didSend = await this.handleInertiaLogic(res, responseText);

        if (didSend) {
            return;
        }

        // Send the response
        res.send(responseText);
    }

    /**
     * Handle Inertia-specific logic for the response
     */
    private async handleInertiaLogic(res: ExpressResponse, responseContent?: string): Promise<boolean> {
        // Only process Inertia-specific logic for Inertia requests
        if (!(this.request.get && this.request.get(Headers.INERTIA))) {
            return false;
        }

        // Set Vary header
        res.setHeader('Vary', Headers.INERTIA);

        // Handle version changes - only if both client and server have versions
        const clientVersion = this.request.get && this.request.get(Headers.VERSION);
        const serverVersion = Inertia.getVersion();

        if (this.request.method === 'GET' && clientVersion && serverVersion && clientVersion !== serverVersion) {
            await this.handleVersionChange(res);
            return true;
        }

        // Handle empty responses - only redirect if we truly have no content
        if (res.statusCode === 200 && (!responseContent || responseContent.length === 0)) {
            await this.handleEmptyResponse(res);
            return true;
        }

        // Handle redirects for PUT/PATCH/DELETE requests
        if (shouldChangeRedirectStatus(this.request.method, res.statusCode)) {
            res.status(303);
            return false; // Return false to let the response continue sending
        }

        return false;
    }

    /**
     * Handle version change responses
     */
    private async handleVersionChange(res: ExpressResponse): Promise<void> {
        const locationResponse = handleVersionChange(this.request.url);

        // Set the headers from the Inertia response if it exists
        if (locationResponse && locationResponse.headers) {
            locationResponse.headers.forEach((value: string, key: string) => {
                res.setHeader(key, value);
            });
        }

        res.status(locationResponse?.status || 409).end();
    }

    /**
     * Handle empty responses
     */
    private async handleEmptyResponse(res: ExpressResponse): Promise<void> {
        // Redirect back to previous page
        const referer = this.request.get && this.request.get('Referer');
        if (referer) {
            res.redirect(302, referer);
        } else {
            // Fallback to home
            res.redirect(302, '/');
        }
    }

    /**
     * Send the response to the provided Express response object
     * This is a convenience method that calls toResponse
     */
    async send(res: ExpressResponse): Promise<void> {
        await this.toResponse(res);
    }

    /**
     * Get the underlying InertiaResponse for advanced usage
     */
    getInertiaResponse(): InertiaResponse {
        return this.inertiaResponse;
    }
}

// Create the Inertia property that will be added to NestJS Request
export function createInertiaProperty(req: any, res: ExpressResponse) {
    // Create a per-request Inertia instance
    const inertiaInstance = new InertiaResponseFactory();

    // Copy global configuration to the per-request instance
    const version = Inertia.getVersion();
    if (version) {
        inertiaInstance.setVersion(version);
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

    if ((Inertia as any).ssrOptions) {
        inertiaInstance.setSsrOptions((Inertia as any).ssrOptions);
    }

    return {
        /**
         * Render a component and automatically send the response
         */
        async render(component: string, props: Record<string, any> = {}): Promise<void> {
            const inertiaResponse = inertiaInstance.render(component, props);
            const nestJSInertiaResponse = new NestJSInertiaResponse(inertiaResponse, req);
            await nestJSInertiaResponse.toResponse(res);
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
        location(url: string): void {
            const locationResponse = inertiaInstance.location(url);
            // Set the headers from the Inertia response if it exists
            if (locationResponse && locationResponse.headers) {
                locationResponse.headers.forEach((value: string, key: string) => {
                    res.setHeader(key, value);
                });
                // Set status from the response
                res.status(locationResponse.status || 409);
            }
        },

        /**
         * Redirect back to the previous page (referer) or to a fallback URL
         */
        back(fallbackUrl: string = '/'): void {
            const referer = req.get && req.get('Referer');
            res.redirect(303, referer || fallbackUrl);
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
}

// Extend Request type to include Inertia property
declare global {
    namespace Express {
        interface Request {
            Inertia: ReturnType<typeof createInertiaProperty>;
        }
    }
}
