import type { Context, Next } from 'hono'
import type { Page, InertiaMiddlewareOptions } from '@inertianode/core';
import { Headers, Inertia, setupInertiaMiddleware, handleVersionChange, handleEmptyResponse, shouldChangeRedirectStatus } from '@inertianode/core';

export function inertiaHonoAdapter(options: InertiaMiddlewareOptions = {}) {
  return async (c: any, next: any) => {
    c = c as Context
    next = next as Next

    // Use normalized middleware setup
    setupInertiaMiddleware(options, () => resolveValidationErrors(c));

    // Continue to next middleware
    await next()

    // Set Vary header
    c.header('Vary', Headers.INERTIA)

    // Check if this is an Inertia request
    if (!c.req.header(Headers.INERTIA)) {
      return
    }

    // Handle version changes
    if (c.req.method === 'GET' && c.req.header(Headers.VERSION) !== Inertia.getVersion()) {
      return handleVersionChange(c.req.url)
    }

    // Handle empty responses
    const response = c.res
    if (response.status === 200 && !response.body) {
      return handleEmptyResponse(c.req.header('Referer'))
    }

    // Handle redirects for PUT/PATCH/DELETE requests
    if (shouldChangeRedirectStatus(c.req.method, response.status)) {
      // Create a new response with 303 status instead of modifying the existing one
      return new Response(response.body, {
        status: 303,
        headers: response.headers,
      })
    }
  }
}

// Helper functions
function resolveValidationErrors(c: Context): Record<string, any> {
  // This would typically access session errors
  // For now, return empty object
  return {}
}

