export interface Page {
  component: string
  props: Record<string, any>
  url: string
  version: string
  clearHistory: boolean
  encryptHistory: boolean
}

export interface Props {}

declare module 'hono' {
  interface ContextRenderer {
    (children: React.ReactElement, props?: Props): Response | Promise<Response>
  }
}