import type { Page, HtmlTemplateOptions, IgnoreFirstLoad, Mergeable, ViteOptions } from './types.js'
import { LazyProp, DeferProp, MergeProp, AlwaysProp, OptionalProp } from './props/index.js'
import { renderHtmlTemplate } from './HtmlRenderer.js'
import { Headers } from './Headers.js'

export class InertiaResponse {
    private component: string
    private props: Record<string, any>
    private responseRootView: string
    private version: string
    private clearHistory: boolean
    private encryptHistory: boolean
    private urlResolver: ((url: string) => string) | null
    private viewData: Record<string, any> = {}
    private renderer: ((page: Page, viewData: any) => string | Promise<string>) | null = null
    private cacheFor: (number | string)[] = []
    private viteOptions: ViteOptions | null = null

    constructor(
        component: string,
        props: Record<string, any>,
        rootView = 'app',
        version = '',
        encryptHistory = false,
        urlResolver: ((url: string) => string) | null = null,
        renderer?: ((page: Page, viewData: any) => string | Promise<string>) | null,
        viteOptions?: ViteOptions | null,
    ) {
        this.component = component
        this.props = props
        this.responseRootView = rootView
        this.version = version
        this.clearHistory = false // Will be set by middleware
        this.encryptHistory = encryptHistory
        this.urlResolver = urlResolver
        this.renderer = renderer || null
        this.viteOptions = viteOptions || null
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

    /**
     * Set cache duration for the response.
     * @param cacheFor - Cache duration in seconds or time string
     */
    cache(cacheFor: number | string | (number | string)[]): this {
        this.cacheFor = Array.isArray(cacheFor) ? cacheFor : [cacheFor]
        return this
    }

    /**
     * Resolve the properties for the response.
     */
    private resolveProperties(request: Request, props: Record<string, any>): Record<string, any> {
        props = this.resolvePartialProperties(props, request)
        props = this.resolveAlways(props)
        props = this.resolvePropertyInstances(props, request)
        return props
    }

    /**
     * Resolve the `only` and `except` partial request props.
     */
    private resolvePartialProperties(props: Record<string, any>, request: Request): Record<string, any> {
        if (!this.isPartial(request)) {
            return Object.fromEntries(
                Object.entries(props).filter(([_, prop]) => !(prop instanceof LazyProp || prop instanceof OptionalProp || prop instanceof DeferProp))
            )
        }

        const onlyHeader = request.headers.get(Headers.PARTIAL_ONLY)
        const exceptHeader = request.headers.get(Headers.PARTIAL_EXCEPT)

        const only = onlyHeader ? onlyHeader.split(',').filter(Boolean) : []
        const except = exceptHeader ? exceptHeader.split(',').filter(Boolean) : []

        if (only.length > 0) {
            const newProps: Record<string, any> = {}
            for (const key of only) {
                const value = this.getNestedValue(props, key)
                // If this is a DeferProp instance, resolve it
                if (value instanceof DeferProp) {
                    this.setNestedValue(newProps, key, value.__invoke())
                } else {
                    this.setNestedValue(newProps, key, value)
                }
            }
            props = newProps
        }

        if (except.length > 0) {
            for (const key of except) {
                this.unsetNestedValue(props, key)
            }
        }

        return props
    }

    /**
     * Resolve `always` properties that should always be included on all visits.
     */
    private resolveAlways(props: Record<string, any>): Record<string, any> {
        const always = Object.fromEntries(
            Object.entries(this.props).filter(([_, prop]) => prop instanceof AlwaysProp)
        )

        return { ...always, ...props }
    }

    /**
     * Resolve all necessary class instances in the given props.
     */
    private resolvePropertyInstances(props: Record<string, any>, request: Request): Record<string, any> {
        for (const [key, value] of Object.entries(props)) {
            if (value instanceof LazyProp ||
                value instanceof OptionalProp ||
                value instanceof AlwaysProp ||
                value instanceof MergeProp) {
                props[key] = value.__invoke()
            } else if (typeof value === 'function') {
                props[key] = value()
            } else if (Array.isArray(value)) {
                props[key] = this.resolvePropertyInstances(value, request)
            } else if (typeof value === 'object' && value !== null) {
                props[key] = this.resolvePropertyInstances(value, request)
            }
        }
        return props
    }

    /**
     * Resolve merge props for the response.
     */
    private resolveMergeProps(request: Request): Record<string, any> {
        const resetHeader = request.headers.get(Headers.RESET)
        const onlyHeader = request.headers.get(Headers.PARTIAL_ONLY)
        const exceptHeader = request.headers.get(Headers.PARTIAL_EXCEPT)

        const resetProps = resetHeader ? resetHeader.split(',').filter(Boolean) : []
        const onlyProps = onlyHeader ? onlyHeader.split(',').filter(Boolean) : []
        const exceptProps = exceptHeader ? exceptHeader.split(',').filter(Boolean) : []

        const mergeProps = Object.entries(this.props)
            .filter(([_, prop]) => prop instanceof MergeProp || prop instanceof DeferProp)
            .filter(([_, prop]) => (prop as Mergeable).shouldMerge())
            .filter(([key, _]) => !resetProps.includes(key))
            .filter(([key, _]) => onlyProps.length === 0 || onlyProps.includes(key))
            .filter(([key, _]) => !exceptProps.includes(key))

        const deepMergeProps = mergeProps
            .filter(([_, prop]) => (prop as Mergeable).shouldDeepMerge())
            .map(([key, _]) => key)

        const matchPropsOn = mergeProps
            .flatMap(([key, prop]) =>
                (prop as Mergeable).matchesOn().map(strategy => `${key}.${strategy}`)
            )

        const regularMergeProps = mergeProps
            .filter(([_, prop]) => !(prop as Mergeable).shouldDeepMerge())
            .map(([key, _]) => key)

        const result: Record<string, any> = {}
        if (regularMergeProps.length > 0) {
            result.mergeProps = regularMergeProps
        }
        if (deepMergeProps.length > 0) {
            result.deepMergeProps = deepMergeProps
        }
        if (matchPropsOn.length > 0) {
            result.matchPropsOn = matchPropsOn
        }

        return result
    }

    /**
     * Resolve cache directions for the response.
     */
    private resolveCacheDirections(request: Request): Record<string, any> {
        if (this.cacheFor.length === 0) {
            return {}
        }

        return {
            cache: this.cacheFor.map(value => {
                if (typeof value === 'string') {
                    // Convert time strings to seconds (basic implementation)
                    // You might want to use a library like 'ms' for more robust parsing
                    const timeUnits: Record<string, number> = {
                        's': 1,
                        'm': 60,
                        'h': 3600,
                        'd': 86400,
                    }

                    const match = value.match(/^(\d+)([smhd])$/)
                    if (match) {
                        const [, num, unit] = match
                        return parseInt(num) * timeUnits[unit]
                    }

                    // Try to parse as number
                    const parsed = parseInt(value)
                    return isNaN(parsed) ? 0 : parsed
                }
                return value
            })
        }
    }

    /**
     * Resolve deferred props for the response.
     */
    private resolveDeferredProps(request: Request): Record<string, any> {
        if (this.isPartial(request)) {
            return {}
        }

        const deferredProps = Object.entries(this.props)
            .filter(([_, prop]) => prop instanceof DeferProp)
            .map(([key, prop]) => ({
                key,
                group: (prop as DeferProp).group()
            }))
            .reduce((groups, item) => {
                const group = item.group || 'default'
                if (!groups[group]) {
                    groups[group] = []
                }
                groups[group].push(item.key)
                return groups
            }, {} as Record<string, string[]>)

        return Object.keys(deferredProps).length > 0 ? { deferredProps } : {}
    }

    /**
     * Resolve deferred props when they are requested.
     * This method should be called when the frontend requests deferred props.
     */
    public resolveDeferredPropsValues(request: Request): Record<string, any> {
        const deferredProps = Object.entries(this.props)
            .filter(([_, prop]) => prop instanceof DeferProp)
            .reduce((result, [key, prop]) => {
                result[key] = (prop as DeferProp).__invoke()
                return result
            }, {} as Record<string, any>)

        return deferredProps
    }

    /**
     * Determine if the request is a partial request.
     */
    private isPartial(request: Request): boolean {
        return request.headers.get(Headers.PARTIAL_COMPONENT) === this.component
    }

    /**
     * Helper method to set nested object values using dot notation.
     */
    private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
        const keys = path.split('.')
        let current = obj
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
                current[keys[i]] = {}
            }
            current = current[keys[i]]
        }
        current[keys[keys.length - 1]] = value
    }

    /**
     * Helper method to get nested object values using dot notation.
     */
    private getNestedValue(obj: Record<string, any>, path: string): any {
        const keys = path.split('.')
        let current = obj
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key]
            } else {
                return undefined
            }
        }
        return current
    }

    /**
     * Helper method to unset nested object values using dot notation.
     */
    private unsetNestedValue(obj: Record<string, any>, path: string): void {
        const keys = path.split('.')
        let current = obj
        for (let i = 0; i < keys.length - 1; i++) {
            if (current && typeof current === 'object' && keys[i] in current) {
                current = current[keys[i]]
            } else {
                return
            }
        }
        if (current && typeof current === 'object' && keys[keys.length - 1] in current) {
            delete current[keys[keys.length - 1]]
        }
    }

    async toResponse(request: Request, htmlOptions?: HtmlTemplateOptions): Promise<Response> {
        const url = this.getUrl(request)

        const resolvedProps = this.resolveProperties(request, this.props)

        const page: Page = {
            component: this.component,
            props: resolvedProps,
            url,
            version: this.version,
            clearHistory: this.clearHistory,
            encryptHistory: this.encryptHistory,
            ...this.resolveMergeProps(request),
            ...this.resolveDeferredProps(request),
            ...this.resolveCacheDirections(request),
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

        if (!htmlOptions) {
            htmlOptions = {}
        }

        // Let the HtmlRenderer determine dev mode based on hot file existence
        // The HtmlRenderer will check for the hot file and use ViteOptions if provided


        // Return HTML response for non-Inertia requests
        const html = this.renderer ? await this.renderer(page, this.viewData) : renderHtmlTemplate(page, htmlOptions, this.viteOptions)
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
