import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Response } from 'express';
import type { createInertiaProperty } from './NestJSResponseExtension.js';

/**
 * Type for the Inertia instance that gets injected into controllers
 */
export type InertiaInstance = ReturnType<typeof createInertiaProperty>;

/**
 * Parameter decorator to inject the Inertia instance into a controller method
 *
 * @example
 * ```typescript
 * import { InertiaDecorator, type InertiaInstance } from '@inertianode/nestjs';
 *
 * @Get('/users')
 * async getUsers(@InertiaDecorator() inertia: InertiaInstance) {
 *   await inertia.render('Users/Index', { users: [] });
 * }
 * ```
 */
export const InertiaDecorator = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): InertiaInstance => {
        const response = ctx.switchToHttp().getResponse<Response>();
        return response.Inertia;
    },
);
