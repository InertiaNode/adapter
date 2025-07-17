import type { Context, Next } from 'hono'
import type { Page } from './types.js'
import { renderHtmlTemplate } from './html.js'

// Inertia Headers
export const Headers = {
  INERTIA: 'X-Inertia',
  ERROR_BAG: 'X-Inertia-Error-Bag',
  LOCATION: 'X-Inertia-Location',
  VERSION: 'X-Inertia-Version',
  PARTIAL_COMPONENT: 'X-Inertia-Partial-Component',
  PARTIAL_ONLY: 'X-Inertia-Partial-Data',
  PARTIAL_EXCEPT: 'X-Inertia-Partial-Except',
  RESET: 'X-Inertia-Reset',
} as const

// Inertia Response Factory
export class InertiaResponseFactory {
  private rootView = 'app'
  private sharedProps: Record<string, any> = {}
  private version: string | (() => string) | null = null
  private shouldClearHistory = false
  private shouldEncryptHistory = false
  private urlResolver: ((url: string) => string) | null = null

  setRootView(name: string): void {
    this.rootView = name
  }

  share(key: string | Record<string, any>, value?: any): void {
    if (typeof key === 'object') {
      this.sharedProps = { ...this.sharedProps, ...key }
    } else {
      this.sharedProps[key] = value
    }
  }

  getShared(key?: string, defaultValue?: any): any {
    if (key) {
      return this.sharedProps[key] ?? defaultValue
    }
    return this.sharedProps
  }

  flushShared(): void {
    this.sharedProps = {}
  }

  setVersion(version: string | (() => string) | null): void {
    this.version = version
  }

  getVersion(): string {
    if (typeof this.version === 'function') {
      return this.version()
    }
    return this.version ?? ''
  }

  resolveUrlUsing(urlResolver: ((url: string) => string) | null): void {
    this.urlResolver = urlResolver
  }

  clearHistory(): void {
    this.shouldClearHistory = true
  }

  encryptHistory(encrypt = true): void {
    this.shouldEncryptHistory = encrypt
  }

  render(component: string, props: Record<string, any> = {}): InertiaResponse {
    const mergedProps = { ...this.sharedProps, ...props }

    return new InertiaResponse(
      component,
      mergedProps,
      this.rootView,
      this.getVersion(),
      this.shouldEncryptHistory,
      this.urlResolver
    )
  }

  location(url: string): Response {
    return new Response('', {
      status: 409,
      headers: {
        [Headers.LOCATION]: url,
      },
    })
  }
}

// Inertia Response
export class InertiaResponse {
  private component: string
  private props: Record<string, any>
  private responseRootView: string
  private version: string
  private clearHistory: boolean
  private encryptHistory: boolean
  private urlResolver: ((url: string) => string) | null
  private viewData: Record<string, any> = {}

  constructor(
    component: string,
    props: Record<string, any>,
    rootView = 'app',
    version = '',
    encryptHistory = false,
    urlResolver: ((url: string) => string) | null = null
  ) {
    this.component = component
    this.props = props
    this.responseRootView = rootView
    this.version = version
    this.clearHistory = false // Will be set by middleware
    this.encryptHistory = encryptHistory
    this.urlResolver = urlResolver
  }

  with(key: string | Record<string, any>, value?: any): this {
    if (typeof key === 'object') {
      this.props = { ...this.props, ...key }
    } else {
      this.props[key] = value
    }
    return this
  }

  withViewData(key: string | Record<string, any>, value?: any): this {
    if (typeof key === 'object') {
      this.viewData = { ...this.viewData, ...key }
    } else {
      this.viewData[key] = value
    }
    return this
  }

  setRootView(rootView: string): this {
    this.responseRootView = rootView
    return this
  }

  toResponse(request: Request, htmlOptions?: any): Response {
    const url = this.getUrl(request)

    const page: Page = {
      component: this.component,
      props: this.props,
      url,
      version: this.version,
      clearHistory: this.clearHistory,
      encryptHistory: this.encryptHistory,
    }

    // Check if this is an Inertia request
    if (request.headers.get(Headers.INERTIA)) {
      return new Response(JSON.stringify(page), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          [Headers.INERTIA]: 'true',
        },
      })
    }

    // Return HTML response for non-Inertia requests
    const html = renderHtmlTemplate(page, htmlOptions)
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    })
  }

  private getUrl(request: Request): string {
    const url = new URL(request.url)
    let path = url.pathname + url.search

    if (this.urlResolver) {
      path = this.urlResolver(path)
    }

    return this.finishUrlWithTrailingSlash(path)
  }

  private finishUrlWithTrailingSlash(url: string): string {
    if (url.length > 1 && url.endsWith('/')) {
      return url.slice(0, -1)
    }
    return url
  }
}

// Global Inertia instance
export const Inertia = new InertiaResponseFactory()

// Inertia Middleware
export interface InertiaMiddlewareOptions {
  version?: string | (() => string)
  html?: (page: Page, viewData: any) => string
  flashMessages?: (c: Context) => Record<string, any>
}

export function inertiaHonoAdapter(options: InertiaMiddlewareOptions = {}) {
  return async (c: Context, next: Next) => {
    // Set version
    if (options.version) {
      Inertia.setVersion(options.version)
    }

    // Set shared props
    Inertia.share({
      errors: resolveValidationErrors(c),
    })

    // Set root view
    Inertia.setRootView('app')

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
      return handleVersionChange(c)
    }

    // Handle empty responses
    const response = c.res
    if (response.status === 200 && !response.body) {
      return handleEmptyResponse(c)
    }

    // Handle redirects for PUT/PATCH/DELETE requests
    if (response.status === 302 && ['PUT', 'PATCH', 'DELETE'].includes(c.req.method)) {
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

function handleVersionChange(c: Context): Response {
  // Reflash session if available
  // For now, just return a location response
  return Inertia.location(c.req.url)
}

function handleEmptyResponse(c: Context): Response {
  // Redirect back to previous page
  const referer = c.req.header('Referer')
  if (referer) {
    return new Response('', {
      status: 302,
      headers: {
        'Location': referer,
      },
    })
  }

  // Fallback to home
  return new Response('', {
    status: 302,
    headers: {
      'Location': '/',
    },
  })
}

// Utility function to check if request is Inertia request
export function isInertiaRequest(request: Request): boolean {
  return request.headers.get(Headers.INERTIA) === 'true'
}

// Utility function to get Inertia page from request
export function getInertiaPage(request: Request): Page | null {
  const contentType = request.headers.get('Content-Type')
  if (contentType?.includes('application/json')) {
    // This would parse the JSON body
    // For now, return null
    return null
  }
  return null
}
