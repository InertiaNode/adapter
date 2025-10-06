import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { InertiaNestJSMiddleware, inertiaNestJSAdapter, createInertiaMiddleware } from '../NestJSAdapter.js'
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

describe('NestJSAdapter', () => {
    let mockRequest: Partial<Request>
    let mockResponse: Partial<Response> & { Inertia?: any }
    let mockNext: NextFunction

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks()

        // Reset setupInertiaMiddleware mock to default behavior
        vi.mocked(setupInertiaMiddleware).mockImplementation(() => {})

        // Setup mock request
        mockRequest = {
            method: 'GET',
            url: '/test',
            originalUrl: '/test',
            protocol: 'http',
            get: vi.fn((header: string) => {
                if (header === 'host') return 'localhost:3000'
                return undefined
            }) as any,
            headers: {
                'user-agent': 'test-agent',
                'accept': 'text/html'
            },
            body: {}
        }

        // Setup mock response
        mockResponse = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis() as any,
            redirect: vi.fn() as any,
            end: vi.fn()
        }

        // Setup mock next function
        mockNext = vi.fn() as any
    })

    describe('InertiaNestJSMiddleware', () => {
        it('should create middleware class', () => {
            const middleware = new InertiaNestJSMiddleware()
            expect(middleware).toBeDefined()
            expect(typeof middleware.use).toBe('function')
        })

        it('should add Inertia property to response object', () => {
            const middleware = new InertiaNestJSMiddleware()

            middleware.use(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect((mockResponse as any).Inertia).toBeDefined()
            expect(typeof (mockResponse as any).Inertia.render).toBe('function')
            expect(typeof (mockResponse as any).Inertia.share).toBe('function')
            expect(typeof (mockResponse as any).Inertia.setVersion).toBe('function')
            expect(typeof (mockResponse as any).Inertia.getVersion).toBe('function')
            expect(typeof (mockResponse as any).Inertia.setRootView).toBe('function')
            expect(typeof (mockResponse as any).Inertia.setViteOptions).toBe('function')
            expect(typeof (mockResponse as any).Inertia.location).toBe('function')
        })

        it('should call setupInertiaMiddleware with options', () => {
            const options = {
                version: '1.0.0'
            }
            const middleware = new InertiaNestJSMiddleware(options)

            middleware.use(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect(setupInertiaMiddleware).toHaveBeenCalledWith(
                options,
                expect.any(Function)
            )
        })

        it('should call setupInertiaMiddleware with empty options when none provided', () => {
            const middleware = new InertiaNestJSMiddleware()

            middleware.use(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect(setupInertiaMiddleware).toHaveBeenCalledWith(
                {},
                expect.any(Function)
            )
        })

        it('should call next() after setup', () => {
            const middleware = new InertiaNestJSMiddleware()

            middleware.use(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect(mockNext).toHaveBeenCalled()
        })
    })

    describe('inertiaNestJSAdapter', () => {
        it('should create middleware function', () => {
            const middleware = inertiaNestJSAdapter()

            expect(typeof middleware).toBe('function')
            expect(middleware.length).toBe(3) // req, res, next parameters
        })

        it('should add Inertia property to response object', () => {
            const middleware = inertiaNestJSAdapter()

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect((mockResponse as any).Inertia).toBeDefined()
            expect(typeof (mockResponse as any).Inertia.render).toBe('function')
            expect(typeof (mockResponse as any).Inertia.share).toBe('function')
            expect(typeof (mockResponse as any).Inertia.setVersion).toBe('function')
            expect(typeof (mockResponse as any).Inertia.getVersion).toBe('function')
            expect(typeof (mockResponse as any).Inertia.setRootView).toBe('function')
            expect(typeof (mockResponse as any).Inertia.setViteOptions).toBe('function')
            expect(typeof (mockResponse as any).Inertia.location).toBe('function')
        })

        it('should call setupInertiaMiddleware with options', () => {
            const options = {
                version: '1.0.0'
            }
            const middleware = inertiaNestJSAdapter(options)

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect(setupInertiaMiddleware).toHaveBeenCalledWith(
                options,
                expect.any(Function)
            )
        })

        it('should call setupInertiaMiddleware with empty options when none provided', () => {
            const middleware = inertiaNestJSAdapter()

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect(setupInertiaMiddleware).toHaveBeenCalledWith(
                {},
                expect.any(Function)
            )
        })

        it('should call next() after setup', () => {
            const middleware = inertiaNestJSAdapter()

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect(mockNext).toHaveBeenCalled()
        })

        it('should handle errors gracefully', () => {
            const middleware = inertiaNestJSAdapter()

            // Mock setupInertiaMiddleware to throw an error
            vi.mocked(setupInertiaMiddleware).mockImplementation(() => {
                throw new Error('Setup failed')
            })

            expect(() => middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )).toThrow('Setup failed')
        })
    })

    describe('createInertiaMiddleware', () => {
        it('should create a middleware class with options', () => {
            const options = {
                rootView: 'app',
                version: '1.0.0'
            }
            const MiddlewareClass = createInertiaMiddleware(options)
            const middleware = new MiddlewareClass()

            expect(middleware).toBeDefined()
            expect(typeof middleware.use).toBe('function')
        })

        it('should apply options when middleware is used', () => {
            const options = {
                version: '1.0.0'
            }
            const MiddlewareClass = createInertiaMiddleware(options)
            const middleware = new MiddlewareClass()

            middleware.use(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect(setupInertiaMiddleware).toHaveBeenCalledWith(
                options,
                expect.any(Function)
            )
        })
    })

    describe('resolveValidationErrors', () => {
        it('should return empty object for validation errors', () => {
            const middleware = inertiaNestJSAdapter()

            middleware(
                mockRequest as Request,
                mockResponse as Response,
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
