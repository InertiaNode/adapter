import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Response } from 'express';
import type { Inertia } from './NestJSResponseExtension.js';

/**
 * Type for the Inertia instance that gets injected into controllers
 * Can be called directly or accessed via methods
 */
export type InertiaInstance = Inertia;

/**
 * Parameter decorator to inject the Inertia instance into a controller method
 *
 * @example
 * ```typescript
 * import { Inert, type InertiaInstance } from '@inertianode/nestjs';
 *
 * @Get('/users')
 * async getUsers(@Inert() inertia: InertiaInstance) {
 *   await inertia.render('Users/Index', { users: [] });
 * }
 * ```
 */
export const Inert = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): InertiaInstance => {
        const response = ctx.switchToHttp().getResponse<Response>();
        return response.Inertia;
    },
);
