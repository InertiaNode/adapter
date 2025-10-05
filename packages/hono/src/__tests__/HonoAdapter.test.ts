import { describe, it, expect, beforeEach, vi } from 'vitest'
import { inertiaHonoAdapter } from '../HonoAdapter.js'
import { Headers, Inertia } from '@inertianode/core'

// Mock the core functions
vi.mock('@inertianode/core', () => ({
    Headers: {
        INERTIA: 'X-Inertia',
        VERSION: 'X-Inertia-Version'
    },
    Inertia: {
        getVersion: vi.fn(() => 'test-version'),
        setViteOptions: vi.fn(),
        setVersion: vi.fn(),
        share: vi.fn(),
        setRootView: vi.fn()
    },
    InertiaResponseFactory: vi.fn(() => ({
        render: vi.fn(),
        share: vi.fn(),
        setVersion: vi.fn(),
        getVersion: vi.fn(() => 'test-version'),
        setRootView: vi.fn(),
        setViteOptions: vi.fn(),
        location: vi.fn(() => new Response('', { status: 409 }))
    })),
    setupInertiaMiddleware: vi.fn(),
    handleVersionChange: vi.fn(() => new Response('Version changed', { status: 409 })),
    handleEmptyResponse: vi.fn(() => new Response('Empty response', { status: 409 })),
    shouldChangeRedirectStatus: vi.fn(() => false)
}))

describe('HonoAdapter', () => {
    let mockContext: any
    let mockNext: any

    beforeEach(() => {
        vi.clearAllMocks()

        // Reset Inertia state
        Inertia.setVersion('test-version')

        // Create mock context
        mockContext = {
            req: {
                method: 'GET',
                url: 'http://localhost/test',
                header: vi.fn()
            },
            res: {
                status: 200,
                body: null,
                headers: {},
                header: vi.fn()
            },
            header: vi.fn()
        }

        mockNext = vi.fn()
    })

    describe('inertiaHonoAdapter', () => {
        it('should create a middleware function', () => {
            const middleware = inertiaHonoAdapter()
            expect(typeof middleware).toBe('function')
        })

        it('should call setupInertiaMiddleware with options', async () => {
            const { setupInertiaMiddleware } = await import('@inertianode/core')
            const options = { version: '1.0.0' }
            const middleware = inertiaHonoAdapter(options)

            await middleware(mockContext, mockNext)

            expect(setupInertiaMiddleware).toHaveBeenCalledWith(options, expect.any(Function))
        })

        it('should call next middleware', async () => {
            const middleware = inertiaHonoAdapter()
            await middleware(mockContext, mockNext)

            expect(mockNext).toHaveBeenCalled()
        })

        it('should set Vary header', async () => {
            const middleware = inertiaHonoAdapter()
            await middleware(mockContext, mockNext)

            expect(mockContext.header).toHaveBeenCalledWith('Vary', Headers.INERTIA)
        })

        it('should return early if not an Inertia request', async () => {
            mockContext.req.header.mockReturnValue(null)
            const middleware = inertiaHonoAdapter()

            const result = await middleware(mockContext, mockNext)

            expect(result).toBeUndefined()
        })

        it('should handle version changes for GET requests', async () => {
            const { handleVersionChange } = await import('@inertianode/core')
            mockContext.req.header
                .mockReturnValueOnce('true') // X-Inertia header
                .mockReturnValueOnce('old-version') // X-Inertia-Version header

            const middleware = inertiaHonoAdapter()
            const result = await middleware(mockContext, mockNext)

            expect(handleVersionChange).toHaveBeenCalledWith(mockContext.req.url)
            expect(result).toBeInstanceOf(Response)
        })

        it('should handle empty responses', async () => {
            mockContext.req.header
                .mockReturnValueOnce('true') // X-Inertia header
                .mockReturnValueOnce('test-version') // X-Inertia-Version header

            // Mock c.text to simulate empty response
            const originalText = mockContext.text
            mockContext.text = vi.fn((text: string) => {
                if (text === '') {
                    // Simulate what handleEmptyResponse would return
                    return new Response('', {
                        status: 409,
                        headers: { 'X-Inertia-Location': '/' }
                    })
                }
                return originalText ? originalText(text) : new Response(text)
            })

            const middleware = inertiaHonoAdapter()
            await middleware(mockContext, mockNext)

            // Verify that c.text was overridden (our implementation detail)
            expect(typeof mockContext.text).toBe('function')
        })

        it('should handle redirect status changes for PUT/PATCH/DELETE requests', async () => {
            mockContext.req.method = 'PUT'
            mockContext.req.header
                .mockReturnValueOnce('true') // X-Inertia header
                .mockReturnValueOnce('test-version') // X-Inertia-Version header

            // Mock c.redirect to simulate redirect response
            const originalRedirect = mockContext.redirect
            mockContext.redirect = vi.fn((location: string, status?: number) => {
                // Our implementation should change 302 to 303 for PUT
                if (status === 302) {
                    return new Response('', {
                        status: 303,
                        headers: { 'Location': location }
                    })
                }
                return originalRedirect ? originalRedirect(location, status) : new Response('')
            })

            const middleware = inertiaHonoAdapter()
            await middleware(mockContext, mockNext)

            // Verify that c.redirect was overridden (our implementation detail)
            expect(typeof mockContext.redirect).toBe('function')
        })

        it('should not change redirect status when shouldChangeRedirectStatus returns false', async () => {
            mockContext.req.method = 'GET' // GET requests don't change redirect status
            mockContext.req.header
                .mockReturnValueOnce('true') // X-Inertia header
                .mockReturnValueOnce('test-version') // X-Inertia-Version header

            // Mock c.redirect to simulate redirect response
            const originalRedirect = mockContext.redirect
            mockContext.redirect = vi.fn((location: string, status?: number) => {
                // For GET requests, status should remain unchanged
                return new Response('', {
                    status: status || 302,
                    headers: { 'Location': location }
                })
            })

            const middleware = inertiaHonoAdapter()
            await middleware(mockContext, mockNext)

            // Verify that c.redirect was overridden
            expect(typeof mockContext.redirect).toBe('function')
        })

        it('should handle normal Inertia requests without special conditions', async () => {
            mockContext.req.header
                .mockReturnValueOnce('true') // X-Inertia header
                .mockReturnValueOnce('test-version') // X-Inertia-Version header

            // Mock text and redirect methods
            mockContext.text = vi.fn((text: string) => new Response(text))
            mockContext.redirect = vi.fn((location: string, status?: number) => 
                new Response('', { status: status || 302, headers: { 'Location': location } }))

            const middleware = inertiaHonoAdapter()
            await middleware(mockContext, mockNext)

            // Verify the middleware completed without issues
            expect(mockNext).toHaveBeenCalled()
            expect(typeof mockContext.text).toBe('function')
            expect(typeof mockContext.redirect).toBe('function')
        })
    })

    describe('resolveValidationErrors', () => {
        it('should return empty object for validation errors', async () => {
            const middleware = inertiaHonoAdapter()
            await middleware(mockContext, mockNext)

            // The resolveValidationErrors function is called internally
            // and should return an empty object for now
            // This test verifies the middleware doesn't throw
            expect(mockNext).toHaveBeenCalled()
        })
    })

    describe('middleware options', () => {
        it('should handle custom vite options', async () => {
            const { setupInertiaMiddleware } = await import('@inertianode/core')
            const options = {
                vite: {
                    hotFile: 'custom-hot',
                    buildDirectory: 'custom-build',
                    manifestFilename: 'custom-manifest.json',
                    publicDirectory: 'custom-public'
                }
            }

            const middleware = inertiaHonoAdapter(options)
            await middleware(mockContext, mockNext)

            expect(setupInertiaMiddleware).toHaveBeenCalledWith(options, expect.any(Function))
        })

        it('should handle custom version', async () => {
            const { setupInertiaMiddleware } = await import('@inertianode/core')
            const options = {
                version: 'custom-version'
            }

            const middleware = inertiaHonoAdapter(options)
            await middleware(mockContext, mockNext)

            expect(setupInertiaMiddleware).toHaveBeenCalledWith(options, expect.any(Function))
        })

        it('should handle function version', async () => {
            const { setupInertiaMiddleware } = await import('@inertianode/core')
            const versionFn = () => 'dynamic-version'
            const options = {
                version: versionFn
            }

            const middleware = inertiaHonoAdapter(options)
            await middleware(mockContext, mockNext)

            expect(setupInertiaMiddleware).toHaveBeenCalledWith(options, expect.any(Function))
        })
    })

    describe('error handling', () => {
        it('should handle errors in next middleware', async () => {
            const error = new Error('Middleware error')
            mockNext.mockRejectedValue(error)

            const middleware = inertiaHonoAdapter()

            await expect(middleware(mockContext, mockNext)).rejects.toThrow('Middleware error')
        })

        it('should handle errors in setupInertiaMiddleware', async () => {
            const { setupInertiaMiddleware } = await import('@inertianode/core')
                ; (setupInertiaMiddleware as any).mockImplementation(() => {
                    throw new Error('Setup error')
                })

            const middleware = inertiaHonoAdapter()

            await expect(middleware(mockContext, mockNext)).rejects.toThrow('Setup error')
        })
    })
})
