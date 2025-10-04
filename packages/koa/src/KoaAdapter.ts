import type { Context, Next } from 'koa';
import type { InertiaMiddlewareOptions } from '@inertianode/core';
import { setupInertiaMiddleware } from '@inertianode/core';
import { createInertiaProperty } from './KoaResponseExtension.js';

export function inertiaKoaAdapter(options: InertiaMiddlewareOptions = {}) {
    return async (ctx: Context, next: Next) => {
        // Add Inertia property to context object
        (ctx as any).Inertia = createInertiaProperty(ctx);

        // Use normalized middleware setup
        setupInertiaMiddleware(options, () => resolveValidationErrors(ctx));

        // Continue to next middleware
        await next();
    };
}

// Helper functions
function resolveValidationErrors(_ctx: Context): Record<string, any> {
    // This would typically access session errors
    // For now, return empty object
    return {};
}