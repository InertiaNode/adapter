import type { Context, Next } from 'hono'
import type { Page, InertiaMiddlewareOptions } from '@inertianode/core';
import { Headers, Inertia, setupInertiaMiddleware, handleVersionChange, handleEmptyResponse, shouldChangeRedirectStatus } from '@inertianode/core';

export function inertiaHonoAdapter(options: InertiaMiddlewareOptions = {}) {
  return async (c: Context, next: Next) => {
    // Use normalized middleware setup
    setupInertiaMiddleware(options, () => resolveValidationErrors(c));

    // Always set Vary header
    c.header('Vary', Headers.INERTIA)

    // Check if this is an Inertia request
    const isInertiaRequest = c.req.header(Headers.INERTIA)
    
    // If not an Inertia request, continue normally
    if (!isInertiaRequest) {
      await next()
      return
    }

    // Get the version from options or Inertia instance
    const getVersion = () => {
      if (options.version) {
        return typeof options.version === 'function' ? options.version() : options.version
      }
      return Inertia.getVersion()
    }

    // Handle version changes for GET requests
    const requestVersion = c.req.header(Headers.VERSION)
    const inertiaVersion = getVersion()

    if (c.req.method === 'GET' &&
      requestVersion &&
      inertiaVersion &&
      requestVersion !== inertiaVersion) {
      const versionResponse = handleVersionChange(c.req.url)
      return versionResponse
    }

    // Intercept the response by wrapping the context methods if they exist
    if (typeof c.text === 'function') {
      const originalText = c.text.bind(c)
      
      // Override c.text to intercept empty responses
      c.text = (text: string, init?: ResponseInit) => {
        if (text === '') {
          // This is an empty response, return 409 for Inertia requests
          const emptyResponse = handleEmptyResponse(c.req.header('Referer'))
          return emptyResponse
        }
        return originalText(text, init)
      }
    }
    
    if (typeof c.redirect === 'function') {
      const originalRedirect = c.redirect.bind(c)
      
      // Override c.redirect to change status for PUT/PATCH/DELETE
      c.redirect = (location: string, status?: number) => {
        if (shouldChangeRedirectStatus(c.req.method, status || 302)) {
          return originalRedirect(location, 303)
        }
        return originalRedirect(location, status)
      }
    }

    await next()
  }
}

// Helper functions
function resolveValidationErrors(c: Context): Record<string, any> {
  // This would typically access session errors
  // For now, return empty object
  return {}
}