export interface Page {
  component: string
  props: Record<string, any>
  url: string
  version: string
  clearHistory: boolean
  encryptHistory: boolean
  mergeProps?: string[]
  deepMergeProps?: string[]
  matchPropsOn?: string[]
  deferredProps?: Record<string, string[]>
  cache?: number[]
}

export interface SsrResponse {
  head: string[]
  body: string
}

export interface Props { }

export type ViteOptions = {
  hotFile: string
  buildDirectory: string
  manifestFilename: string
  publicDirectory: string
  entrypoints: string[]
}

export interface SsrOptions {
  enabled: boolean
  url?: string
}

export interface InertiaMiddlewareOptions {
  version?: string | (() => string)
  flashMessages?: () => Record<string, any>
  html?: (page: Page, viewData: any) => string | Promise<string>
  vite?: Partial<ViteOptions>
  ssr?: SsrOptions
}

export interface HtmlTemplateOptions {
  title?: string
  dev?: boolean
  hotUrl?: string
  head?: string
  body?: string
}

// Prop type interfaces
export interface IgnoreFirstLoad {
  // Marker interface for props that should be ignored on first load
}

export interface Mergeable {
  merge(): this
  shouldMerge(): boolean
  shouldDeepMerge(): boolean
  matchesOn(): string[]
  append(path?: boolean | string | string[], matchOn?: string): this
  prepend(path?: boolean | string | string[], matchOn?: string): this
  appendsAtRoot(): boolean
  prependsAtRoot(): boolean
  appendsAtPaths(): string[]
  prependsAtPaths(): string[]
}

export interface PropCallback {
  (): any
}

// Re-export prop classes from their individual files
export { LazyProp, DeferProp, MergeProp, AlwaysProp, OptionalProp } from './props/index.js'



