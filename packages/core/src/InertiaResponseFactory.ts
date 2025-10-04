import type { Page, ViteOptions, PropCallback } from './types.js'
import { InertiaResponse } from './InertiaResponse.js'
import { Headers } from './Headers.js'
import { LazyProp, DeferProp, MergeProp, AlwaysProp, OptionalProp } from './props/index.js'

export class InertiaResponseFactory {
    private rootView = 'app'
    private sharedProps: Record<string, any> = {}
    private version: string | (() => string) | null = null
    private shouldClearHistory = false
    private shouldEncryptHistory = false
    private urlResolver: ((url: string) => string) | null = null
    private viteOptions: Partial<ViteOptions> = {}
    private renderer?: (page: Page, viewData: any) => string | Promise<string>

    setRootView(name: string): void {
        this.rootView = name
    }

    setViteOptions(options: Partial<ViteOptions>): void {
        this.viteOptions = {
            ...this.viteOptions,
            ...(options || {}),
        };
    }

    setRenderer(renderer: (page: Page, viewData: any) => string | Promise<string>): void {
        this.renderer = renderer
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

    getVersion(): string | undefined {
        if (typeof this.version === 'function') {
            return this.version()
        }
        return this.version ?? undefined
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
            this.urlResolver,
            this.renderer,
            this.viteOptions,
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

    // Prop helper methods
    lazy(callback: PropCallback): LazyProp {
        return new LazyProp(callback)
    }

    defer(callback: PropCallback, group?: string): DeferProp {
        return new DeferProp(callback, group)
    }

    merge(value: any): MergeProp {
        return new MergeProp(value)
    }

    deepMerge(value: any): MergeProp {
        return new MergeProp(value).deepMerge()
    }

    always(value: any): AlwaysProp {
        return new AlwaysProp(value)
    }

    optional(callback: PropCallback): OptionalProp {
        return new OptionalProp(callback)
    }
}
