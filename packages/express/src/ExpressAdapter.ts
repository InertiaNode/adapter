import type { Request, Response, NextFunction } from 'express';
import type { InertiaMiddlewareOptions } from '@inertianode/core';
import { setupInertiaMiddleware } from '@inertianode/core';
import { createInertiaProperty } from './ExpressResponseExtension.js';

export function inertiaExpressAdapter(options: InertiaMiddlewareOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Add Inertia property to response object
        (res as any).Inertia = createInertiaProperty(req, res);

        // Use normalized middleware setup
        setupInertiaMiddleware(options, () => resolveValidationErrors(req));

        // Continue to next middleware
        await next();
    };
}

// Helper functions
function resolveValidationErrors(_req: Request): Record<string, any> {
    // This would typically access session errors
    // For now, return empty object
    return {};
}
