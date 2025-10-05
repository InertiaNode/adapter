import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import type { InertiaMiddlewareOptions } from '@inertianode/core';
import { setupInertiaMiddleware } from '@inertianode/core';
import { createInertiaProperty } from './NestJSResponseExtension.js';

@Injectable()
export class InertiaNestJSMiddleware implements NestMiddleware {
    protected readonly options: InertiaMiddlewareOptions;

    constructor(options: InertiaMiddlewareOptions = {}) {
        this.options = options;
    }

    use(req: Request, res: Response, next: NextFunction) {
        // Add Inertia property to request object
        (req as any).Inertia = createInertiaProperty(req, res);

        // Use normalized middleware setup
        setupInertiaMiddleware(this.options, () => resolveValidationErrors(req));

        // Continue to next middleware
        next();
    }
}

/**
 * Factory function to create the Inertia middleware
 * This is useful when you want to configure the middleware with options
 */
export function createInertiaMiddleware(options: InertiaMiddlewareOptions = {}) {
    @Injectable()
    class ConfiguredInertiaNestJSMiddleware implements NestMiddleware {
        use(req: Request, res: Response, next: NextFunction) {
            // Add Inertia property to request object
            (req as any).Inertia = createInertiaProperty(req, res);

            // Use normalized middleware setup
            setupInertiaMiddleware(options, () => resolveValidationErrors(req));

            // Continue to next middleware
            next();
        }
    }

    return ConfiguredInertiaNestJSMiddleware;
}

/**
 * Simple middleware function for use without dependency injection
 */
export function inertiaNestJSAdapter(options: InertiaMiddlewareOptions = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
        // Add Inertia property to request object
        (req as any).Inertia = createInertiaProperty(req, res);

        // Use normalized middleware setup
        setupInertiaMiddleware(options, () => resolveValidationErrors(req));

        // Continue to next middleware
        next();
    };
}

// Helper functions
function resolveValidationErrors(_req: Request): Record<string, any> {
    // This would typically access session errors
    // For now, return empty object
    return {};
}
