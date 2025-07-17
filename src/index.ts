export * from './inertia.js'
export * from './types.js'
export * from './html.js'

// Main Hono middleware export
export { inertiaHonoAdapter } from './inertia.js'

// Re-export commonly used types and utilities
export type { Page } from './types.js'
export type { HtmlTemplateOptions } from './html.js'
export { Headers, Inertia, InertiaResponse, InertiaResponseFactory } from './inertia.js'

// Hono module augmentation
declare module 'hono' {

}
