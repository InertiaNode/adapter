import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response } from 'express'
import { createInertiaProperty, NestJSInertiaResponse } from '../NestJSResponseExtension.js'
import type { InertiaResponse } from '@inertianode/core'

// Mock the core module
vi.mock('@inertianode/core', () => ({
    InertiaResponseFactory: class MockInertiaResponseFactory {
        render = vi.fn(() => ({
            toResponse: vi.fn().mockResolvedValue(
                new Response('<html>test</html>', {
                    status: 200,
                    headers: { 'Content-Type': 'text/html' }
                })
            )
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

describe('NestJSResponseExtension', () => {
    let mockRequest: Partial<Request>
    let mockResponse: Partial<Response>

    beforeEach(() => {
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
            send: vi.fn() as any,
            redirect: vi.fn() as any,
            end: vi.fn(),
            statusCode: 200
        }
    })

    describe('createInertiaProperty', () => {
        it('should create Inertia property with all methods', () => {
            const inertia = createInertiaProperty(mockRequest as Request, mockResponse as Response)

            expect(typeof inertia.render).toBe('function')
            expect(typeof inertia.share).toBe('function')
            expect(typeof inertia.setVersion).toBe('function')
            expect(typeof inertia.getVersion).toBe('function')
            expect(typeof inertia.setRootView).toBe('function')
            expect(typeof inertia.setViteOptions).toBe('function')
            expect(typeof inertia.location).toBe('function')
            expect(typeof inertia.back).toBe('function')
            expect(typeof inertia.clearHistory).toBe('function')
            expect(typeof inertia.encryptHistory).toBe('function')
        })

        it('should render a component', async () => {
            const inertia = createInertiaProperty(mockRequest as Request, mockResponse as Response)

            await inertia.render('Test/Component', { foo: 'bar' })

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.send).toHaveBeenCalledWith('<html>test</html>')
        })

        it('should call share with object', () => {
            const inertia = createInertiaProperty(mockRequest as Request, mockResponse as Response)

            inertia.share({ foo: 'bar', baz: 'qux' })

            // The share method should work without errors
            expect(() => inertia.share({ foo: 'bar' })).not.toThrow()
        })

        it('should call share with key and value', () => {
            const inertia = createInertiaProperty(mockRequest as Request, mockResponse as Response)

            inertia.share('foo', 'bar')

            // The share method should work without errors
            expect(() => inertia.share('foo', 'bar')).not.toThrow()
        })

        it('should set version', () => {
            const inertia = createInertiaProperty(mockRequest as Request, mockResponse as Response)

            inertia.setVersion('1.0.0')

            // The setVersion method should work without errors
            expect(() => inertia.setVersion('1.0.0')).not.toThrow()
        })

        it('should set root view', () => {
            const inertia = createInertiaProperty(mockRequest as Request, mockResponse as Response)

            inertia.setRootView('app')

            // The setRootView method should work without errors
            expect(() => inertia.setRootView('app')).not.toThrow()
        })

        it('should set Vite options', () => {
            const inertia = createInertiaProperty(mockRequest as Request, mockResponse as Response)

            const options = { input: 'src/main.ts' }
            inertia.setViteOptions(options)

            // The setViteOptions method should work without errors
            expect(() => inertia.setViteOptions(options)).not.toThrow()
        })

        it('should handle location redirects', () => {
            const inertia = createInertiaProperty(mockRequest as Request, mockResponse as Response)

            inertia.location('/new-url')

            expect(mockResponse.status).toHaveBeenCalledWith(409)
            expect(mockResponse.setHeader).toHaveBeenCalledWith('x-inertia-location', '/redirect-url')
        })

        it('should handle back redirects with referer', () => {
            mockRequest.get = vi.fn((header: string) => {
                if (header === 'Referer') return '/previous-page'
                if (header === 'host') return 'localhost:3000'
                return undefined
            }) as any

            const inertia = createInertiaProperty(mockRequest as Request, mockResponse as Response)

            inertia.back()

            expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/previous-page')
        })

        it('should handle back redirects without referer', () => {
            const inertia = createInertiaProperty(mockRequest as Request, mockResponse as Response)

            inertia.back()

            expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/')
        })

        it('should handle back redirects with custom fallback', () => {
            const inertia = createInertiaProperty(mockRequest as Request, mockResponse as Response)

            inertia.back('/custom-fallback')

            expect(mockResponse.redirect).toHaveBeenCalledWith(303, '/custom-fallback')
        })

        it('should clear history', () => {
            const inertia = createInertiaProperty(mockRequest as Request, mockResponse as Response)

            inertia.clearHistory()

            // The clearHistory method should work without errors
            expect(() => inertia.clearHistory()).not.toThrow()
        })

        it('should encrypt history', () => {
            const inertia = createInertiaProperty(mockRequest as Request, mockResponse as Response)

            inertia.encryptHistory(true)

            // The encryptHistory method should work without errors
            expect(() => inertia.encryptHistory(true)).not.toThrow()
        })
    })

    describe('NestJSInertiaResponse', () => {
        it('should convert Inertia response to NestJS response', async () => {
            const mockInertiaResponse = {
                toResponse: vi.fn().mockResolvedValue(
                    new Response('<html>test</html>', {
                        status: 200,
                        headers: { 'Content-Type': 'text/html' }
                    })
                )
            } as unknown as InertiaResponse

            const nestJSResponse = new NestJSInertiaResponse(mockInertiaResponse, mockRequest)

            await nestJSResponse.toResponse(mockResponse as Response)

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.send).toHaveBeenCalledWith('<html>test</html>')
        })

        it('should set headers from web response', async () => {
            const mockInertiaResponse = {
                toResponse: vi.fn().mockResolvedValue(
                    new Response('<html>test</html>', {
                        status: 200,
                        headers: {
                            'Content-Type': 'text/html',
                            'X-Custom-Header': 'custom-value'
                        }
                    })
                )
            } as unknown as InertiaResponse

            const nestJSResponse = new NestJSInertiaResponse(mockInertiaResponse, mockRequest)

            await nestJSResponse.toResponse(mockResponse as Response)

            expect(mockResponse.setHeader).toHaveBeenCalledWith('content-type', 'text/html')
            expect(mockResponse.setHeader).toHaveBeenCalledWith('x-custom-header', 'custom-value')
        })

        it('should handle version changes for Inertia requests', async () => {
            // Make it an Inertia request
            mockRequest.get = vi.fn((header: string) => {
                if (header === 'X-Inertia') return 'true'
                if (header === 'X-Inertia-Version') return '1.0.0'
                if (header === 'host') return 'localhost:3000'
                return undefined
            }) as any

            const { Inertia } = await import('@inertianode/core')
            vi.mocked(Inertia.getVersion).mockReturnValue('2.0.0')

            const mockInertiaResponse = {
                toResponse: vi.fn().mockResolvedValue(
                    new Response('<html>test</html>', {
                        status: 200,
                        headers: { 'Content-Type': 'text/html' }
                    })
                )
            } as unknown as InertiaResponse

            const nestJSResponse = new NestJSInertiaResponse(mockInertiaResponse, mockRequest)

            await nestJSResponse.toResponse(mockResponse as Response)

            expect(mockResponse.status).toHaveBeenCalledWith(409)
            expect(mockResponse.end).toHaveBeenCalled()
        })

        it('should use send method as alias for toResponse', async () => {
            const mockInertiaResponse = {
                toResponse: vi.fn().mockResolvedValue(
                    new Response('<html>test</html>', {
                        status: 200,
                        headers: { 'Content-Type': 'text/html' }
                    })
                )
            } as unknown as InertiaResponse

            const nestJSResponse = new NestJSInertiaResponse(mockInertiaResponse, mockRequest)

            await nestJSResponse.send(mockResponse as Response)

            expect(mockResponse.status).toHaveBeenCalledWith(200)
            expect(mockResponse.send).toHaveBeenCalledWith('<html>test</html>')
        })

        it('should return underlying InertiaResponse', () => {
            const mockInertiaResponse = {
                toResponse: vi.fn()
            } as unknown as InertiaResponse

            const nestJSResponse = new NestJSInertiaResponse(mockInertiaResponse, mockRequest)

            expect(nestJSResponse.getInertiaResponse()).toBe(mockInertiaResponse)
        })
    })
})
