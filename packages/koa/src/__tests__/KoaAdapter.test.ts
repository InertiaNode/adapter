import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Context, Next } from 'koa'
import { inertiaKoaAdapter } from '../KoaAdapter.js'
import { setupInertiaMiddleware } from '@inertianode/core'

// Mock the core module
vi.mock('@inertianode/core', () => ({
    setupInertiaMiddleware: vi.fn(),
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

describe('KoaAdapter', () => {
    let mockContext: Partial<Context> & { Inertia?: any; existingProperty?: any }
    let mockNext: Next

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks()
        
        // Reset setupInertiaMiddleware mock to default behavior
        vi.mocked(setupInertiaMiddleware).mockImplementation(() => {})

        // Setup mock context
        mockContext = {
            method: 'GET',
            url: '/test',
            originalUrl: '/test',
            protocol: 'http',
            get: vi.fn((header: string) => {
                if (header === 'host') return 'localhost:3000'
                return undefined
            }) as any,
            set: vi.fn(),
            redirect: vi.fn(),
            headers: {
                'user-agent': 'test-agent',
                'accept': 'text/html'
            },
            request: {
                body: {}
            } as any,
            status: 200,
            body: '',
            existingProperty: undefined
        }

        // Setup mock next function
        mockNext = vi.fn() as any
    })

    describe('inertiaKoaAdapter', () => {
        it('should create middleware function', () => {
            const middleware = inertiaKoaAdapter()

            expect(typeof middleware).toBe('function')
            expect(middleware.length).toBe(2) // ctx, next parameters
        })

        it('should add Inertia property to context object', async () => {
            const middleware = inertiaKoaAdapter()

            await middleware(
                mockContext as Context,
                mockNext
            )

            expect(mockContext.Inertia).toBeDefined()
            expect(typeof mockContext.Inertia.render).toBe('function')
            expect(typeof mockContext.Inertia.share).toBe('function')
            expect(typeof mockContext.Inertia.setVersion).toBe('function')
            expect(typeof mockContext.Inertia.getVersion).toBe('function')
            expect(typeof mockContext.Inertia.setRootView).toBe('function')
            expect(typeof mockContext.Inertia.setViteOptions).toBe('function')
            expect(typeof mockContext.Inertia.location).toBe('function')
        })

        it('should call setupInertiaMiddleware with options', async () => {
            const options = {
                rootView: 'app',
                version: '1.0.0'
            }
            const middleware = inertiaKoaAdapter(options)

            await middleware(
                mockContext as Context,
                mockNext
            )

            expect(setupInertiaMiddleware).toHaveBeenCalledWith(
                options,
                expect.any(Function)
            )
        })

        it('should call setupInertiaMiddleware with empty options when none provided', async () => {
            const middleware = inertiaKoaAdapter()

            await middleware(
                mockContext as Context,
                mockNext
            )

            expect(setupInertiaMiddleware).toHaveBeenCalledWith(
                {},
                expect.any(Function)
            )
        })

        it('should call next() after setup', async () => {
            const middleware = inertiaKoaAdapter()

            await middleware(
                mockContext as Context,
                mockNext
            )

            expect(mockNext).toHaveBeenCalled()
        })

        it('should handle errors gracefully', async () => {
            const middleware = inertiaKoaAdapter()

            // Mock setupInertiaMiddleware to throw an error
            vi.mocked(setupInertiaMiddleware).mockImplementation(() => {
                throw new Error('Setup failed')
            })

            await expect(middleware(
                mockContext as Context,
                mockNext
            )).rejects.toThrow('Setup failed')
        })

        it('should preserve existing context properties', async () => {
            const existingProperty = { some: 'value' }
            mockContext.existingProperty = existingProperty

            const middleware = inertiaKoaAdapter()

            await middleware(
                mockContext as Context,
                mockNext
            )

            expect(mockContext.existingProperty).toBe(existingProperty)
            expect(mockContext.Inertia).toBeDefined()
        })
    })

    describe('resolveValidationErrors', () => {
        it('should return empty object for validation errors', async () => {
            const middleware = inertiaKoaAdapter()

            await middleware(
                mockContext as Context,
                mockNext
            )

            // The resolveValidationErrors function is called internally
            // We can verify it's called by checking the setupInertiaMiddleware call
            const setupCall = vi.mocked(setupInertiaMiddleware).mock.calls[0]
            const validationResolver = setupCall[1]

            const result = validationResolver()
            expect(result).toEqual({})
        })
    })
})