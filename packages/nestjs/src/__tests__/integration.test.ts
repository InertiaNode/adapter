import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { inertiaNestJSAdapter } from '../NestJSAdapter.js'

// Mock the core module
vi.mock('@inertianode/core', () => ({
    setupInertiaMiddleware: vi.fn(),
    InertiaResponseFactory: class MockInertiaResponseFactory {
        private sharedData: Record<string, any> = {}
        private version?: string

        render = vi.fn((component: string, props: Record<string, any>) => ({
            toResponse: vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ component, props: { ...this.sharedData, ...props } }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                })
            )
        }))

        share = vi.fn((key: string | Record<string, any>, value?: any) => {
            if (typeof key === 'object') {
                this.sharedData = { ...this.sharedData, ...key }
            } else {
                this.sharedData[key] = value
            }
        })

        setVersion = vi.fn((version: string | (() => string)) => {
            this.version = typeof version === 'function' ? version() : version
        })

        getVersion = vi.fn(() => this.version)
        setRootView = vi.fn()
        setViteOptions = vi.fn()
        setRenderer = vi.fn()
        resolveUrlUsing = vi.fn()
        setSsrOptions = vi.fn()

        location = vi.fn((url: string) => ({
            status: 409,
            headers: new globalThis.Headers({ 'X-Inertia-Location': url }),
            forEach: (fn: any) => {
                fn(url, 'X-Inertia-Location')
            }
        }))

        clearHistory = vi.fn()
        encryptHistory = vi.fn()
    },
    Inertia: {
        getVersion: vi.fn()
    },
    Headers: {
        INERTIA: 'X-Inertia',
        VERSION: 'X-Inertia-Version',
        LOCATION: 'X-Inertia-Location'
    },
    handleVersionChange: vi.fn(() => ({
        status: 409,
        headers: new globalThis.Headers({ 'X-Inertia-Location': '/redirect-url' })
    })),
    handleEmptyResponse: vi.fn(() => ({
        status: 302,
        headers: new globalThis.Headers({ 'Location': '/' })
    })),
    shouldChangeRedirectStatus: vi.fn(() => false)
}))

describe('NestJS Adapter Integration Tests', () => {
    let mockRequest: Partial<Request>
    let mockResponse: Partial<Response>
    let mockNext: NextFunction

    beforeEach(() => {
        vi.clearAllMocks()

        mockRequest = {
            method: 'GET',
            url: '/users',
            originalUrl: '/users',
            protocol: 'http',
            get: vi.fn((header: string) => {
                if (header === 'host') return 'localhost:3000'
                return undefined
            }) as any,
            headers: {
                'accept': 'text/html'
            },
            body: {}
        }

        mockResponse = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            send: vi.fn() as any,
            redirect: vi.fn() as any,
            end: vi.fn(),
            statusCode: 200
        }

        mockNext = vi.fn() as any
    })

    describe('Complete request flow', () => {
        it('should handle a complete Inertia request', async () => {
            const middleware = inertiaNestJSAdapter({
                version: '1.0.0'
            })

            // Apply middleware
            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            // Verify middleware was called
            expect(mockNext).toHaveBeenCalled()

            // Verify Inertia property exists
            expect((mockResponse as any).Inertia).toBeDefined()

            // Simulate controller using Inertia
            const inertia = (mockResponse as any).Inertia

            // Share some data
            inertia.share('user', { id: 1, name: 'John' })
            inertia.share('flash', { message: 'Success!' })

            // Render a component
            await inertia.render('Users/Index', {
                users: [
                    { id: 1, name: 'John' },
                    { id: 2, name: 'Jane' }
                ]
            })

            // Verify response was sent
            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.send).toHaveBeenCalled()
        })

        it('should handle shared data across multiple shares', async () => {
            const middleware = inertiaNestJSAdapter()

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            const inertia = (mockResponse as any).Inertia

            // Share data in multiple calls
            inertia.share('auth', { user: { id: 1 } })
            inertia.share('flash', { success: 'Done!' })
            inertia.share({ errors: {} })

            // Render should include all shared data
            await inertia.render('Dashboard', { stats: { count: 10 } })

            expect(mockResponse.send).toHaveBeenCalled()
        })

        it('should handle location redirects', () => {
            const middleware = inertiaNestJSAdapter()

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            const inertia = (mockResponse as any).Inertia

            // Trigger a location redirect
            inertia.location('/login')

            expect(mockResponse.status).toHaveBeenCalledWith(409)
            expect(mockResponse.setHeader).toHaveBeenCalledWith('x-inertia-location', '/login')
        })

        it('should handle back navigation', () => {
            mockRequest.get = vi.fn((header: string) => {
                if (header === 'Referer') return '/dashboard'
                if (header === 'host') return 'localhost:3000'
                return undefined
            }) as any

            const middleware = inertiaNestJSAdapter()

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            const inertia = (mockResponse as any).Inertia

            // Trigger back navigation
            inertia.back()

            expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/dashboard')
        })

        it('should handle versioning', () => {
            const middleware = inertiaNestJSAdapter()

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            const inertia = (mockResponse as any).Inertia

            // Set version
            inertia.setVersion('2.0.0')

            // Get version should return the set version
            const version = inertia.getVersion()
            expect(version).toBe('2.0.0')
        })

        it('should preserve request data through middleware chain', () => {
            // Add some data to request before middleware
            (mockRequest as any).user = { id: 1, name: 'Test User' }

            const middleware = inertiaNestJSAdapter()

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            // Verify request data is preserved
            expect((mockRequest as any).user).toEqual({ id: 1, name: 'Test User' })
            expect((mockResponse as any).Inertia).toBeDefined()
            expect(mockNext).toHaveBeenCalled()
        })
    })

    describe('Error handling', () => {
        it('should have render method available', async () => {
            const middleware = inertiaNestJSAdapter()

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            const inertia = (mockResponse as any).Inertia

            // Test that the render method exists and can be called successfully
            expect(typeof inertia.render).toBe('function')
            await inertia.render('Test', {})
            // Verify that the response was sent
            expect(mockResponse.send).toHaveBeenCalled()
        })
    })
})
