import { describe, it, expect, beforeEach, vi } from 'vitest'
import Koa from 'koa'
import { inertiaKoaAdapter } from '../KoaAdapter.js'
import { Inertia } from '@inertianode/core'

// Mock the core module
vi.mock('@inertianode/core', () => ({
    Inertia: {
        render: vi.fn(),
        share: vi.fn(),
        setVersion: vi.fn(),
        getVersion: vi.fn(),
        setRootView: vi.fn(),
        setViteOptions: vi.fn(),
        location: vi.fn().mockReturnValue(new Response('', {
            status: 409,
            headers: { 'X-Inertia-Location': '/redirect-url' }
        }))
    },
    Headers: {
        INERTIA: 'X-Inertia',
        VERSION: 'X-Inertia-Version',
        LOCATION: 'X-Inertia-Location'
    },
    setupInertiaMiddleware: vi.fn(),
    handleVersionChange: vi.fn().mockReturnValue(new Response('', {
        status: 409,
        headers: { 'X-Inertia-Location': '/redirect-url' }
    })),
    handleEmptyResponse: vi.fn().mockReturnValue(new Response('', {
        status: 302,
        headers: { 'Location': '/' }
    })),
    shouldChangeRedirectStatus: vi.fn()
}))

describe('Koa Adapter Integration', () => {
    let app: Koa

    beforeEach(() => {
        vi.clearAllMocks()
        app = new Koa()
    })

    describe('Middleware Integration', () => {
        it('should add Inertia property to context object', async () => {
            app.use(inertiaKoaAdapter())

            let contextCheck: any = null
            app.use((ctx, next) => {
                contextCheck = ctx
                expect(ctx.Inertia).toBeDefined()
                expect(typeof ctx.Inertia.render).toBe('function')
                expect(typeof ctx.Inertia.share).toBe('function')
                expect(typeof ctx.Inertia.setVersion).toBe('function')
                expect(typeof ctx.Inertia.getVersion).toBe('function')
                expect(typeof ctx.Inertia.setRootView).toBe('function')
                expect(typeof ctx.Inertia.setViteOptions).toBe('function')
                expect(typeof ctx.Inertia.location).toBe('function')

                ctx.status = 200
                ctx.body = { success: true }
            })

            // Mock a basic request/response cycle
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

            // Execute middleware chain manually
            const inertiaMiddleware = inertiaKoaAdapter()
            await inertiaMiddleware(mockContext, async () => {
                mockContext.status = 200
                mockContext.body = { success: true }
                await mockNext()
            })

            expect(mockContext.Inertia).toBeDefined()
            expect(mockNext).toHaveBeenCalled()
        })

        it('should handle Inertia render requests', async () => {
            const mockInertiaResponse = {
                toResponse: vi.fn().mockResolvedValue(new Response('test response', {
                    status: 200,
                    headers: { 'Content-Type': 'text/html' }
                }))
            }
            vi.mocked(Inertia.render).mockReturnValue(mockInertiaResponse as any)

            // Create mock context
            const mockContext = {
                method: 'GET',
                url: '/users/123',
                get: vi.fn().mockReturnValue(undefined),
                set: vi.fn(),
                redirect: vi.fn(),
                headers: {},
                request: { body: {} },
                status: 200,
                body: '',
                params: { id: '123' }
            } as any

            // Manually call the middleware and route handler
            const middleware = inertiaKoaAdapter()
            await middleware(mockContext, async () => {
                if (mockContext.Inertia) {
                    await mockContext.Inertia.render('Users/Show', { userId: '123' })
                    expect(Inertia.render).toHaveBeenCalledWith('Users/Show', { userId: '123' })
                }
            })
        })

        it('should handle shared data', async () => {
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

            const middleware = inertiaKoaAdapter()
            await middleware(mockContext, async () => {
                if (mockContext.Inertia) {
                    // Test sharing data with object
                    const sharedData = { user: { id: 1, name: 'John' } }
                    mockContext.Inertia.share(sharedData)
                    expect(Inertia.share).toHaveBeenCalledWith(sharedData)

                    // Test sharing data with key-value
                    mockContext.Inertia.share('currentUser', { id: 1, name: 'John' })
                    expect(Inertia.share).toHaveBeenCalledWith('currentUser', { id: 1, name: 'John' })
                }
            })
        })

        it('should handle version management', async () => {
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

            const middleware = inertiaKoaAdapter()
            await middleware(mockContext, async () => {
                if (mockContext.Inertia) {
                    // Test setting version
                    mockContext.Inertia.setVersion('2.0.0')
                    expect(Inertia.setVersion).toHaveBeenCalledWith('2.0.0')

                    // Test getting version
                    mockContext.Inertia.getVersion()
                    expect(Inertia.getVersion).toHaveBeenCalled()
                }
            })
        })

        it('should handle location responses', async () => {
            // Mock the location response to return the correct headers
            vi.mocked(Inertia.location).mockReturnValue(new Response('', {
                status: 409,
                headers: { 'X-Inertia-Location': '/new-location' }
            }))

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

            const middleware = inertiaKoaAdapter()
            await middleware(mockContext, async () => {
                if (mockContext.Inertia) {
                    mockContext.Inertia.location('/new-location')
                    
                    expect(Inertia.location).toHaveBeenCalledWith('/new-location')
                    expect(mockContext.set).toHaveBeenCalledWith('x-inertia-location', '/new-location')
                }
            })
        })

        it('should handle Vite options configuration', async () => {
            const viteOptions = {
                dev: true,
                hotFile: 'hot',
                buildDirectory: 'build'
            }

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

            const middleware = inertiaKoaAdapter()
            await middleware(mockContext, async () => {
                if (mockContext.Inertia) {
                    mockContext.Inertia.setViteOptions(viteOptions)
                    expect(Inertia.setViteOptions).toHaveBeenCalledWith(viteOptions)
                }
            })
        })

        it('should handle root view configuration', async () => {
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

            const middleware = inertiaKoaAdapter()
            await middleware(mockContext, async () => {
                if (mockContext.Inertia) {
                    mockContext.Inertia.setRootView('customApp')
                    expect(Inertia.setRootView).toHaveBeenCalledWith('customApp')
                }
            })
        })
    })

    describe('Options handling', () => {
        it('should pass options to setupInertiaMiddleware', async () => {
            const options = {
                version: '1.0.0',
                html: vi.fn()
            }

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

            const middleware = inertiaKoaAdapter(options)
            await middleware(mockContext, vi.fn())

            const { setupInertiaMiddleware } = await import('@inertianode/core')
            expect(setupInertiaMiddleware).toHaveBeenCalledWith(
                options,
                expect.any(Function)
            )
        })

        it('should handle empty options', async () => {
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

            const middleware = inertiaKoaAdapter()
            await middleware(mockContext, vi.fn())

            const { setupInertiaMiddleware } = await import('@inertianode/core')
            expect(setupInertiaMiddleware).toHaveBeenCalledWith(
                {},
                expect.any(Function)
            )
        })
    })

    describe('Error handling', () => {
        it('should propagate errors from middleware setup', async () => {
            const setupError = new Error('Setup failed')
            const { setupInertiaMiddleware } = await import('@inertianode/core')
            vi.mocked(setupInertiaMiddleware).mockImplementation(() => {
                throw setupError
            })

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

            const middleware = inertiaKoaAdapter()
            
            await expect(middleware(mockContext, vi.fn())).rejects.toThrow('Setup failed')
        })

        it('should handle render errors gracefully', async () => {
            // Reset the setupInertiaMiddleware mock to not throw for this test
            const { setupInertiaMiddleware } = await import('@inertianode/core')
            vi.mocked(setupInertiaMiddleware).mockImplementation((options, getValidationErrors) => {
                // Don't throw an error, just do nothing
            })

            const renderError = new Error('Render failed')
            const mockInertiaResponse = {
                toResponse: vi.fn().mockRejectedValue(renderError)
            }
            vi.mocked(Inertia.render).mockReturnValue(mockInertiaResponse as any)

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

            const middleware = inertiaKoaAdapter()
            
            await expect(middleware(mockContext, async () => {
                if (mockContext.Inertia) {
                    await mockContext.Inertia.render('TestComponent')
                }
            })).rejects.toThrow('Render failed')
        })
    })
})