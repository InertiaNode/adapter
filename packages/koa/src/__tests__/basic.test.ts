import { describe, it, expect, vi } from 'vitest'
import { inertiaKoaAdapter } from '../KoaAdapter.js'
import { createInertiaProperty } from '../KoaResponseExtension.js'
import { Inertia } from '@inertianode/core'

// Mock the core module
vi.mock('@inertianode/core', () => ({
    setupInertiaMiddleware: vi.fn(),
    Inertia: {
        render: vi.fn(),
        share: vi.fn(),
        setVersion: vi.fn(),
        getVersion: vi.fn(),
        setRootView: vi.fn(),
        setViteOptions: vi.fn(),
        location: vi.fn(() => new Response('', {
            status: 409,
            headers: { 'X-Inertia-Location': '/redirect-url' }
        }))
    },
    InertiaResponseFactory: class MockInertiaResponseFactory {
        render = vi.fn(() => ({
            toResponse: vi.fn().mockResolvedValue(new Response('test response'))
        }))
        share = vi.fn()
        setVersion = vi.fn()
        getVersion = vi.fn()
        setRootView = vi.fn()
        setViteOptions = vi.fn()
        setRenderer = vi.fn()
        resolveUrlUsing = vi.fn()
        setSsrOptions = vi.fn()
        location = vi.fn(() => ({
            status: 409,
            headers: new globalThis.Headers({ 'X-Inertia-Location': '/redirect-url' }),
            forEach: (fn: any) => {
                fn('/redirect-url', 'X-Inertia-Location')
            }
        }))
        clearHistory = vi.fn()
        encryptHistory = vi.fn()
    },
    Headers: {
        INERTIA: 'X-Inertia',
        VERSION: 'X-Inertia-Version',
        LOCATION: 'X-Inertia-Location'
    },
    handleVersionChange: vi.fn(() => new Response('', {
        status: 409,
        headers: { 'X-Inertia-Location': '/redirect-url' }
    })),
    handleEmptyResponse: vi.fn(() => new Response('', {
        status: 302,
        headers: { 'Location': '/' }
    })),
    shouldChangeRedirectStatus: vi.fn()
}))

describe('Koa Adapter Basic Tests', () => {
    describe('inertiaKoaAdapter', () => {
        it('should return a middleware function', () => {
            const middleware = inertiaKoaAdapter()
            expect(typeof middleware).toBe('function')
        })

        it('should accept options parameter', () => {
            const options = { version: '1.0.0' }
            const middleware = inertiaKoaAdapter(options)
            expect(typeof middleware).toBe('function')
        })

        it('should work with empty options', () => {
            const middleware = inertiaKoaAdapter({})
            expect(typeof middleware).toBe('function')
        })

        it('should work without options', () => {
            const middleware = inertiaKoaAdapter()
            expect(typeof middleware).toBe('function')
        })
    })

    describe('createInertiaProperty', () => {
        const mockContext = {
            method: 'GET',
            url: '/test',
            get: vi.fn(),
            set: vi.fn(),
            redirect: vi.fn(),
            headers: {},
            request: { body: {} },
            status: 200,
            body: ''
        } as any

        it('should create an object with required methods', () => {
            const inertia = createInertiaProperty(mockContext)
            
            expect(typeof inertia.render).toBe('function')
            expect(typeof inertia.share).toBe('function')
            expect(typeof inertia.setVersion).toBe('function')
            expect(typeof inertia.getVersion).toBe('function')
            expect(typeof inertia.setRootView).toBe('function')
            expect(typeof inertia.setViteOptions).toBe('function')
            expect(typeof inertia.location).toBe('function')
        })

        it('should call appropriate Inertia methods', () => {
            const inertia = createInertiaProperty(mockContext)

            // Test share with object
            const shareData = { key: 'value' }
            expect(() => inertia.share(shareData)).not.toThrow()

            // Test share with key-value
            expect(() => inertia.share('testKey', 'testValue')).not.toThrow()

            // Test setVersion
            expect(() => inertia.setVersion('2.0.0')).not.toThrow()

            // Test getVersion
            expect(() => inertia.getVersion()).not.toThrow()

            // Test setRootView
            expect(() => inertia.setRootView('customApp')).not.toThrow()

            // Test setViteOptions
            const viteOptions = { dev: true }
            expect(() => inertia.setViteOptions(viteOptions)).not.toThrow()

            // Test location
            expect(() => inertia.location('/test-location')).not.toThrow()
        })

        it('should handle render method', async () => {
            const inertia = createInertiaProperty(mockContext)

            // The render method should be defined and callable
            expect(typeof inertia.render).toBe('function')
        })
    })

    describe('Integration', () => {
        it('should work together in typical usage', async () => {
            const middleware = inertiaKoaAdapter({ version: '1.0.0' })
            const mockContext = {
                method: 'GET',
                url: '/test',
                get: vi.fn(),
                set: vi.fn(),
                redirect: vi.fn(),
                headers: {},
                request: { body: {} },
                status: 200,
                body: ''
            } as any
            const mockNext = vi.fn()

            await middleware(mockContext, mockNext)

            expect(mockContext.Inertia).toBeDefined()
            expect(typeof mockContext.Inertia.render).toBe('function')
            expect(mockNext).toHaveBeenCalled()
        })
    })
})