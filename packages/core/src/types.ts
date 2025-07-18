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

export interface Props { }

export type ViteOptions = {
  hotFile: string
  buildDirectory: string
  manifestFilename: string
  publicDirectory: string
}

export interface InertiaMiddlewareOptions {
  version?: string | (() => string)
  flashMessages?: () => Record<string, any>
  html?: (page: Page, viewData: any) => string | Promise<string>
  vite?: ViteOptions
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
}

export interface PropCallback {
  (): any
}

// Re-export prop classes from their individual files
export { LazyProp, DeferProp, MergeProp, AlwaysProp, OptionalProp } from './props/index.js'



