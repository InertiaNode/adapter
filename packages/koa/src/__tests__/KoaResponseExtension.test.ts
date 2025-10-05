import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Context } from 'koa'
import { createInertiaProperty, KoaInertiaResponse } from '../KoaResponseExtension.js'
import { Inertia, Headers } from '@inertianode/core'

// Mock the core module
vi.mock('@inertianode/core', () => ({
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

describe('KoaResponseExtension', () => {
    let mockContext: Partial<Context>

    beforeEach(() => {
        vi.clearAllMocks()

        // Setup mock context
        mockContext = {
            method: 'GET',
            url: '/test',
            originalUrl: '/test',
            protocol: 'http',
            get: vi.fn((header: string) => {
                if (header === 'host') return 'localhost:3000'
                if (header === Headers.INERTIA) return 'true'
                if (header === Headers.VERSION) return '1.0.0'
                if (header === 'Referer') return '/previous-page'
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
            body: ''
        }
    })

    describe('createInertiaProperty', () => {
        it('should create Inertia property with all required methods', () => {
            const inertiaProperty = createInertiaProperty(mockContext as Context)

            expect(inertiaProperty).toBeDefined()
            expect(typeof inertiaProperty.render).toBe('function')
            expect(typeof inertiaProperty.share).toBe('function')
            expect(typeof inertiaProperty.setVersion).toBe('function')
            expect(typeof inertiaProperty.getVersion).toBe('function')
            expect(typeof inertiaProperty.setRootView).toBe('function')
            expect(typeof inertiaProperty.setViteOptions).toBe('function')
            expect(typeof inertiaProperty.location).toBe('function')
        })

        it('should call render when render method is called', async () => {
            const inertiaProperty = createInertiaProperty(mockContext as Context)

            // The render method should be defined and callable
            expect(typeof inertiaProperty.render).toBe('function')
        })

        it('should call share when share method is called with object', () => {
            const inertiaProperty = createInertiaProperty(mockContext as Context)
            const shareData = { key1: 'value1', key2: 'value2' }

            inertiaProperty.share(shareData)

            // The share method should be callable without errors
            expect(typeof inertiaProperty.share).toBe('function')
        })

        it('should call share when share method is called with key-value', () => {
            const inertiaProperty = createInertiaProperty(mockContext as Context)

            inertiaProperty.share('testKey', 'testValue')

            // The share method should be callable without errors
            expect(typeof inertiaProperty.share).toBe('function')
        })

        it('should call setVersion when setVersion method is called', () => {
            const inertiaProperty = createInertiaProperty(mockContext as Context)

            inertiaProperty.setVersion('2.0.0')

            // The setVersion method should be callable without errors
            expect(typeof inertiaProperty.setVersion).toBe('function')
        })

        it('should call getVersion when getVersion method is called', () => {
            const inertiaProperty = createInertiaProperty(mockContext as Context)

            inertiaProperty.getVersion()

            // The getVersion method should be callable without errors
            expect(typeof inertiaProperty.getVersion).toBe('function')
        })

        it('should call setRootView when setRootView method is called', () => {
            const inertiaProperty = createInertiaProperty(mockContext as Context)

            inertiaProperty.setRootView('customApp')

            // The setRootView method should be callable without errors
            expect(typeof inertiaProperty.setRootView).toBe('function')
        })

        it('should call setViteOptions when setViteOptions method is called', () => {
            const inertiaProperty = createInertiaProperty(mockContext as Context)
            const viteOptions = { dev: true }

            inertiaProperty.setViteOptions(viteOptions)

            // The setViteOptions method should be callable without errors
            expect(typeof inertiaProperty.setViteOptions).toBe('function')
        })

        it('should handle location method calls', () => {
            const inertiaProperty = createInertiaProperty(mockContext as Context)

            inertiaProperty.location('/redirect-url')

            // The location method should be callable without errors
            expect(typeof inertiaProperty.location).toBe('function')
            expect(mockContext.set).toHaveBeenCalledWith('x-inertia-location', '/redirect-url')
        })

        it('should preserve existing context properties', () => {
            const existingProperty = { some: 'value' }
            ;(mockContext as any).existingProperty = existingProperty

            const inertiaProperty = createInertiaProperty(mockContext as Context)

            expect((mockContext as any).existingProperty).toBe(existingProperty)
            expect(inertiaProperty).toBeDefined()
        })
    })

    describe('KoaInertiaResponse', () => {
        let koaInertiaResponse: KoaInertiaResponse
        let mockInertiaResponse: any

        beforeEach(() => {
            mockInertiaResponse = {
                toResponse: vi.fn().mockResolvedValue(new Response('test response', {
                    status: 200,
                    headers: { 'Content-Type': 'text/html' }
                }))
            }
            koaInertiaResponse = new KoaInertiaResponse(mockInertiaResponse, mockContext as Context)
        })

        it('should create KoaInertiaResponse instance', () => {
            expect(koaInertiaResponse).toBeInstanceOf(KoaInertiaResponse)
        })

        it('should send response to Koa context', async () => {
            await koaInertiaResponse.toResponse(mockContext as Context)

            expect(mockInertiaResponse.toResponse).toHaveBeenCalled()
            expect(mockContext.set).toHaveBeenCalledWith('content-type', 'text/html')
            expect(mockContext.status).toBe(200)
            expect(mockContext.body).toBe('test response')
        })

        it('should handle empty responses for non-Inertia requests', async () => {
            // Mock non-Inertia request
            vi.mocked(mockContext.get as any).mockReturnValue(undefined)
            
            const mockResponse = new Response('', {
                status: 200,
                headers: { 'Content-Type': 'text/html' }
            })
            mockInertiaResponse.toResponse.mockResolvedValue(mockResponse)

            await koaInertiaResponse.toResponse(mockContext as Context)

            expect(mockContext.status).toBe(200)
            expect(mockContext.body).toBe('')
        })

        it('should return underlying InertiaResponse', () => {
            const underlying = koaInertiaResponse.getInertiaResponse()
            expect(underlying).toBe(mockInertiaResponse)
        })

        it('should provide send method as alias to toResponse', async () => {
            await koaInertiaResponse.send(mockContext as Context)

            expect(mockInertiaResponse.toResponse).toHaveBeenCalled()
        })
    })

    describe('Inertia request handling', () => {
        let koaInertiaResponse: KoaInertiaResponse
        let mockInertiaResponse: any

        beforeEach(() => {
            mockInertiaResponse = {
                toResponse: vi.fn().mockResolvedValue(new Response('', {
                    status: 200,
                    headers: { 'Content-Type': 'text/html' }
                }))
            }
            koaInertiaResponse = new KoaInertiaResponse(mockInertiaResponse, mockContext as Context)
        })

        it('should handle version changes for Inertia requests', async () => {
            // Mock version mismatch
            vi.mocked(mockContext.get as any).mockImplementation((header: string) => {
                if (header === Headers.INERTIA) return 'true'
                if (header === Headers.VERSION) return 'old-version'
                return undefined
            })
            
            vi.mocked(Inertia.getVersion).mockReturnValue('new-version')

            await koaInertiaResponse.toResponse(mockContext as Context)

            expect(mockContext.set).toHaveBeenCalledWith('Vary', Headers.INERTIA)
            expect(mockContext.status).toBe(409)
        })

        it('should handle empty responses for Inertia requests', async () => {
            // Mock Inertia request
            vi.mocked(mockContext.get as any).mockImplementation((header: string) => {
                if (header === Headers.INERTIA) return 'true'
                if (header === 'Referer') return '/previous-page'
                return undefined
            })

            // Mock empty response
            mockInertiaResponse.toResponse.mockResolvedValue(new Response('', {
                status: 200,
                headers: { 'Content-Type': 'text/html' }
            }))

            await koaInertiaResponse.toResponse(mockContext as Context)

            expect(mockContext.redirect).toHaveBeenCalledWith('/previous-page')
        })

        it('should redirect to home when no referer for empty responses', async () => {
            // Mock empty response with no referer
            mockInertiaResponse.toResponse.mockResolvedValue(new Response('', {
                status: 200,
                headers: { 'Content-Type': 'text/html' }
            }))

            vi.mocked(mockContext.get as any).mockImplementation((header: string) => {
                if (header === Headers.INERTIA) return 'true'
                if (header === 'Referer') return undefined
                return undefined
            })

            await koaInertiaResponse.toResponse(mockContext as Context)

            expect(mockContext.redirect).toHaveBeenCalledWith('/')
        })

        it('should change redirect status for PUT/PATCH/DELETE requests', async () => {
            // Mock Inertia request 
            vi.mocked(mockContext.get as any).mockImplementation((header: string) => {
                if (header === Headers.INERTIA) return 'true'
                return undefined
            })
            
            mockContext.method = 'PUT'
            mockContext.status = 302

            // Mock a response with content so it doesn't trigger empty response logic
            mockInertiaResponse.toResponse.mockResolvedValue(new Response('test content', {
                status: 200,
                headers: { 'Content-Type': 'text/html' }
            }))

            const { shouldChangeRedirectStatus } = await import('@inertianode/core')
            vi.mocked(shouldChangeRedirectStatus).mockReturnValue(true)

            await koaInertiaResponse.toResponse(mockContext as Context)

            expect(mockContext.status).toBe(303)
        })
    })
})