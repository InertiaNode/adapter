import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { InertiaResponse } from '@inertianode/core';
import { Inertia, Headers, handleVersionChange, handleEmptyResponse, shouldChangeRedirectStatus } from '@inertianode/core';

// Helper function to convert Express request to web Request
function expressRequestToWebRequest(req: ExpressRequest): Request {
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const headers = new globalThis.Headers();

    // Copy headers from Express request to web Request headers
    Object.entries(req.headers).forEach(([key, value]: [string, any]) => {
        if (value !== undefined) {
            headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
    });

    return new Request(url, {
        method: req.method,
        headers,
        body: req.body,
    });
}

// Helper function to convert web Response headers to Express headers
function setExpressHeaders(webResponse: Response, expressResponse: ExpressResponse): void {
    webResponse.headers.forEach((value: string, key: string) => {
        expressResponse.setHeader(key, value);
    });
}

// Extend InertiaResponse with Express-specific methods
export class ExpressInertiaResponse {
    private inertiaResponse: InertiaResponse;
    private expressRequest: ExpressRequest;

    constructor(inertiaResponse: InertiaResponse, expressRequest: ExpressRequest) {
        this.inertiaResponse = inertiaResponse;
        this.expressRequest = expressRequest;
    }

    /**
     * Send the Inertia response to an Express response object
     */
    async toResponse(res: ExpressResponse): Promise<void> {
        // Handle Inertia-specific logic before sending the response
        const didSend = await this.handleInertiaLogic(res);

        if (didSend) {
            return;
        }

        const webRequest = expressRequestToWebRequest(this.expressRequest);
        const webResponse = await this.inertiaResponse.toResponse(webRequest);

        // Convert web Response headers to Express headers
        setExpressHeaders(webResponse, res);

        // Get the response body as text
        const responseText = await webResponse.text();

        // Send the response
        res.status(webResponse.status).send(responseText);
    }

    /**
     * Handle Inertia-specific logic for the response
     */
    private async handleInertiaLogic(res: ExpressResponse): Promise<boolean> {
        // Only process Inertia-specific logic for Inertia requests
        if (!this.expressRequest.get(Headers.INERTIA)) {
            return false;
        }

        // Set Vary header
        res.setHeader('Vary', Headers.INERTIA);

        // Handle version changes
        if (this.expressRequest.method === 'GET' &&
            this.expressRequest.get(Headers.VERSION) !== Inertia.getVersion() && (this.expressRequest.get(Headers.VERSION) || Inertia.getVersion())) {
            await this.handleVersionChange(res);
            return true;
        }

        // Handle empty responses
        if (res.statusCode === 200 && !res.get('Content-Length')) {
            await this.handleEmptyResponse(res);
            return true;
        }

        // Handle redirects for PUT/PATCH/DELETE requests
        if (shouldChangeRedirectStatus(this.expressRequest.method, res.statusCode)) {
            res.status(303);
            return true;
        }

        return false;
    }

    /**
     * Handle version change responses
     */
    private async handleVersionChange(res: ExpressResponse): Promise<void> {
        const locationResponse = handleVersionChange(this.expressRequest.url);

        // Set the headers from the Inertia response
        locationResponse.headers.forEach((value: string, key: string) => {
            res.setHeader(key, value);
        });

        res.status(locationResponse.status).end();
    }

    /**
     * Handle empty responses
     */
    private async handleEmptyResponse(res: ExpressResponse): Promise<void> {
        // Redirect back to previous page
        const referer = this.expressRequest.get('Referer');
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

// Create the Inertia property that will be added to Express Response
export function createInertiaProperty(req: ExpressRequest, res: ExpressResponse) {
    return {
        /**
         * Render a component and automatically send the response
         */
        async render(component: string, props: Record<string, any> = {}): Promise<void> {
            const inertiaResponse = Inertia.render(component, props);
            const expressInertiaResponse = new ExpressInertiaResponse(inertiaResponse, req);
            await expressInertiaResponse.toResponse(res);
        },

        /**
         * Share data with all Inertia requests
         */
        share(key: string | Record<string, any>, value?: any): void {
            Inertia.share(key, value);
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
            // Set the headers from the Inertia response
            locationResponse.headers.forEach((value: string, key: string) => {
                // This would need to be called on the actual response object
                // For now, we'll handle this differently
            });
        }
    };
}

// Extend Express Response type to include Inertia property
declare global {
    namespace Express {
        interface Response {
            Inertia: ReturnType<typeof createInertiaProperty>;
        }
    }
}
