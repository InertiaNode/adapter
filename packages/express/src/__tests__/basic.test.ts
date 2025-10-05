import { describe, it, expect, vi } from 'vitest'
import { inertiaExpressAdapter } from '../ExpressAdapter.js'
import { createInertiaProperty } from '../ExpressResponseExtension.js'
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

describe('Express Adapter Basic Tests', () => {
    describe('inertiaExpressAdapter', () => {
        it('should return a middleware function', () => {
            const middleware = inertiaExpressAdapter()
            expect(typeof middleware).toBe('function')
        })

        it('should accept options parameter', () => {
            const options = { version: '1.0.0' }
            const middleware = inertiaExpressAdapter(options)
            expect(typeof middleware).toBe('function')
        })

        it('should work with empty options', () => {
            const middleware = inertiaExpressAdapter()
            expect(typeof middleware).toBe('function')
        })
    })

    describe('createInertiaProperty', () => {
        it('should return an object with Inertia methods', () => {
            const mockReq = {} as any
            const mockRes = {} as any

            const inertiaProperty = createInertiaProperty(mockReq, mockRes)

            expect(inertiaProperty).toBeDefined()
            expect(typeof inertiaProperty.render).toBe('function')
            expect(typeof inertiaProperty.share).toBe('function')
            expect(typeof inertiaProperty.setVersion).toBe('function')
            expect(typeof inertiaProperty.getVersion).toBe('function')
            expect(typeof inertiaProperty.setRootView).toBe('function')
            expect(typeof inertiaProperty.setViteOptions).toBe('function')
            expect(typeof inertiaProperty.location).toBe('function')
        })

        it('should handle render method calls', () => {
            const mockInertiaResponse = {
                toResponse: vi.fn().mockResolvedValue(new Response('test response'))
            }
            vi.mocked(Inertia.render).mockReturnValue(mockInertiaResponse as any)

            const mockReq = { 
                headers: {}, 
                method: 'GET',
                url: '/test',
                get: vi.fn().mockReturnValue(undefined) 
            } as any
            const mockRes = {
                setHeader: vi.fn(),
                status: vi.fn().mockReturnThis(),
                send: vi.fn()
            } as any

            const inertiaProperty = createInertiaProperty(mockReq, mockRes)

            // This should not throw
            expect(() => {
                inertiaProperty.render('TestComponent', { test: 'data' })
            }).not.toThrow()
        })

        it('should handle share method calls', () => {
            const mockReq = {} as any
            const mockRes = {} as any

            const inertiaProperty = createInertiaProperty(mockReq, mockRes)

            // This should not throw
            expect(() => {
                inertiaProperty.share('key', 'value')
                inertiaProperty.share({ key1: 'value1', key2: 'value2' })
            }).not.toThrow()
        })

        it('should handle setVersion method calls', () => {
            const mockReq = {} as any
            const mockRes = {} as any

            const inertiaProperty = createInertiaProperty(mockReq, mockRes)

            // This should not throw
            expect(() => {
                inertiaProperty.setVersion('1.0.0')
                inertiaProperty.setVersion(() => 'dynamic')
            }).not.toThrow()
        })

        it('should handle getVersion method calls', () => {
            const mockReq = {} as any
            const mockRes = {} as any

            const inertiaProperty = createInertiaProperty(mockReq, mockRes)

            // This should not throw
            expect(() => {
                inertiaProperty.getVersion()
            }).not.toThrow()
        })

        it('should handle setRootView method calls', () => {
            const mockReq = {} as any
            const mockRes = {} as any

            const inertiaProperty = createInertiaProperty(mockReq, mockRes)

            // This should not throw
            expect(() => {
                inertiaProperty.setRootView('custom-app')
            }).not.toThrow()
        })

        it('should handle setViteOptions method calls', () => {
            const mockReq = {} as any
            const mockRes = {} as any

            const inertiaProperty = createInertiaProperty(mockReq, mockRes)

            // This should not throw
            expect(() => {
                inertiaProperty.setViteOptions({
                    hotFile: 'hot',
                    buildDirectory: 'build'
                })
            }).not.toThrow()
        })

        it('should handle location method calls', () => {
            const mockReq = {} as any
            const mockRes = {
                setHeader: vi.fn(),
                status: vi.fn().mockReturnThis()
            } as any

            const inertiaProperty = createInertiaProperty(mockReq, mockRes)

            // This should not throw
            expect(() => {
                inertiaProperty.location('/redirect-url')
            }).not.toThrow()
        })
    })

    describe('Type Safety', () => {
        it('should work with proper Express types', () => {
            // This test ensures the adapter works with proper Express types
            const middleware = inertiaExpressAdapter()

            // Mock Express request and response objects
            const mockReq = {
                method: 'GET',
                url: '/test',
                originalUrl: '/test',
                protocol: 'http',
                get: (header: string) => header === 'host' ? 'localhost:3000' : undefined,
                headers: {},
                body: {}
            } as any

            const mockRes = {
                setHeader: vi.fn(),
                status: vi.fn().mockReturnThis(),
                send: vi.fn(),
                redirect: vi.fn(),
                end: vi.fn()
            } as any

            const mockNext = vi.fn()

            // This should not throw
            expect(() => {
                middleware(mockReq, mockRes, mockNext)
            }).not.toThrow()
        })
    })
})
