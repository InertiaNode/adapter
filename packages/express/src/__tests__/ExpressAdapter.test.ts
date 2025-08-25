import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { inertiaExpressAdapter } from '../ExpressAdapter.js'
import { setupInertiaMiddleware } from '@inertianode/core'

// Mock the core module
vi.mock('@inertianode/core', () => ({
    setupInertiaMiddleware: vi.fn()
}))

describe('ExpressAdapter', () => {
    let mockRequest: Partial<Request>
    let mockResponse: Partial<Response> & { Inertia?: any; existingProperty?: any }
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
            end: vi.fn(),
            existingProperty: undefined
        }

        // Setup mock next function
        mockNext = vi.fn() as any
    })

    describe('inertiaExpressAdapter', () => {
        it('should create middleware function', () => {
            const middleware = inertiaExpressAdapter()

            expect(typeof middleware).toBe('function')
            expect(middleware.length).toBe(3) // req, res, next parameters
        })

        it('should add Inertia property to response object', async () => {
            const middleware = inertiaExpressAdapter()

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect(mockResponse.Inertia).toBeDefined()
            expect(typeof mockResponse.Inertia.render).toBe('function')
            expect(typeof mockResponse.Inertia.share).toBe('function')
            expect(typeof mockResponse.Inertia.setVersion).toBe('function')
            expect(typeof mockResponse.Inertia.getVersion).toBe('function')
            expect(typeof mockResponse.Inertia.setRootView).toBe('function')
            expect(typeof mockResponse.Inertia.setViteOptions).toBe('function')
            expect(typeof mockResponse.Inertia.location).toBe('function')
        })

        it('should call setupInertiaMiddleware with options', async () => {
            const options = {
                rootView: 'app',
                version: '1.0.0'
            }
            const middleware = inertiaExpressAdapter(options)

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect(setupInertiaMiddleware).toHaveBeenCalledWith(
                options,
                expect.any(Function)
            )
        })

        it('should call setupInertiaMiddleware with empty options when none provided', async () => {
            const middleware = inertiaExpressAdapter()

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect(setupInertiaMiddleware).toHaveBeenCalledWith(
                {},
                expect.any(Function)
            )
        })

        it('should call next() after setup', async () => {
            const middleware = inertiaExpressAdapter()

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect(mockNext).toHaveBeenCalled()
        })

        it('should handle errors gracefully', () => {
            const middleware = inertiaExpressAdapter()

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

        it('should preserve existing response properties', () => {
            const existingProperty = { some: 'value' }
            mockResponse.existingProperty = existingProperty

            const middleware = inertiaExpressAdapter()

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            )

            expect(mockResponse.existingProperty).toBe(existingProperty)
            expect(mockResponse.Inertia).toBeDefined()
        })
    })

    describe('resolveValidationErrors', () => {
        it('should return empty object for validation errors', () => {
            const middleware = inertiaExpressAdapter()

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
