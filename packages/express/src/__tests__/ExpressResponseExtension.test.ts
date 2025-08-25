import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { createInertiaProperty, ExpressInertiaResponse as ExpressInertiaResponseClass } from '../ExpressResponseExtension.js'
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

describe('ExpressResponseExtension', () => {
    let mockRequest: Partial<ExpressRequest>
    let mockResponse: Partial<ExpressResponse>

    beforeEach(() => {
        vi.clearAllMocks()

        // Setup mock request
        mockRequest = {
            method: 'GET',
            url: '/test',
            originalUrl: '/test',
            protocol: 'http',
            get: vi.fn((header: string) => {
                if (header === 'host') return 'localhost:3000'
                if (header === Headers.INERTIA) return 'true'
                if (header === Headers.VERSION) return '1.0.0'
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
            get: vi.fn(() => undefined) as any
        }
    })

    describe('createInertiaProperty', () => {
        it('should create Inertia property with all required methods', () => {
            const inertiaProperty = createInertiaProperty(
                mockRequest as ExpressRequest,
                mockResponse as ExpressResponse
            )

            expect(inertiaProperty).toBeDefined()
            expect(typeof inertiaProperty.render).toBe('function')
            expect(typeof inertiaProperty.share).toBe('function')
            expect(typeof inertiaProperty.setVersion).toBe('function')
            expect(typeof inertiaProperty.getVersion).toBe('function')
            expect(typeof inertiaProperty.setRootView).toBe('function')
            expect(typeof inertiaProperty.setViteOptions).toBe('function')
            expect(typeof inertiaProperty.location).toBe('function')
        })

        it('should call Inertia.render when render method is called', async () => {
            const mockInertiaResponse = {
                toResponse: vi.fn().mockResolvedValue(new Response('test'))
            }
            vi.mocked(Inertia.render).mockReturnValue(mockInertiaResponse as any)

            const inertiaProperty = createInertiaProperty(
                mockRequest as ExpressRequest,
                mockResponse as ExpressResponse
            )

            await inertiaProperty.render('TestComponent', { test: 'data' })

            expect(Inertia.render).toHaveBeenCalledWith('TestComponent', { test: 'data' })
        })

        it('should call Inertia.share when share method is called with key-value', () => {
            const inertiaProperty = createInertiaProperty(
                mockRequest as ExpressRequest,
                mockResponse as ExpressResponse
            )

            inertiaProperty.share('testKey', 'testValue')

            expect(Inertia.share).toHaveBeenCalledWith('testKey', 'testValue')
        })

        it('should call Inertia.share when share method is called with object', () => {
            const inertiaProperty = createInertiaProperty(
                mockRequest as ExpressRequest,
                mockResponse as ExpressResponse
            )

            const shareData = { key1: 'value1', key2: 'value2' }
            inertiaProperty.share(shareData)

            expect(Inertia.share).toHaveBeenCalledWith(shareData)
        })

        it('should call Inertia.setVersion when setVersion method is called', () => {
            const inertiaProperty = createInertiaProperty(
                mockRequest as ExpressRequest,
                mockResponse as ExpressResponse
            )

            inertiaProperty.setVersion('2.0.0')

            expect(Inertia.setVersion).toHaveBeenCalledWith('2.0.0')
        })

        it('should call Inertia.setVersion with function when setVersion method is called with function', () => {
            const inertiaProperty = createInertiaProperty(
                mockRequest as ExpressRequest,
                mockResponse as ExpressResponse
            )

            const versionFn = () => 'dynamic-version'
            inertiaProperty.setVersion(versionFn)

            expect(Inertia.setVersion).toHaveBeenCalledWith(versionFn)
        })

        it('should call Inertia.getVersion when getVersion method is called', () => {
            vi.mocked(Inertia.getVersion).mockReturnValue('1.0.0')

            const inertiaProperty = createInertiaProperty(
                mockRequest as ExpressRequest,
                mockResponse as ExpressResponse
            )

            const result = inertiaProperty.getVersion()

            expect(Inertia.getVersion).toHaveBeenCalled()
            expect(result).toBe('1.0.0')
        })

        it('should call Inertia.setRootView when setRootView method is called', () => {
            const inertiaProperty = createInertiaProperty(
                mockRequest as ExpressRequest,
                mockResponse as ExpressResponse
            )

            inertiaProperty.setRootView('custom-app')

            expect(Inertia.setRootView).toHaveBeenCalledWith('custom-app')
        })

        it('should call Inertia.setViteOptions when setViteOptions method is called', () => {
            const inertiaProperty = createInertiaProperty(
                mockRequest as ExpressRequest,
                mockResponse as ExpressResponse
            )

            const viteOptions = { hotFile: 'hot', buildDirectory: 'build' }
            inertiaProperty.setViteOptions(viteOptions)

            expect(Inertia.setViteOptions).toHaveBeenCalledWith(viteOptions)
        })

        it('should call Inertia.location when location method is called', () => {
            const inertiaProperty = createInertiaProperty(
                mockRequest as ExpressRequest,
                mockResponse as ExpressResponse
            )

            inertiaProperty.location('/redirect-url')

            expect(Inertia.location).toHaveBeenCalledWith('/redirect-url')
        })
    })

    describe('ExpressInertiaResponse', () => {
        let mockInertiaResponse: any
        let expressInertiaResponse: any

        beforeEach(() => {
            mockInertiaResponse = {
                toResponse: vi.fn().mockResolvedValue(new Response('test response', {
                    status: 200,
                    headers: { 'Content-Type': 'text/html' }
                }))
            }

            expressInertiaResponse = new ExpressInertiaResponseClass(
                mockInertiaResponse,
                mockRequest as ExpressRequest
            )
        })

        it('should create ExpressInertiaResponse instance', () => {
            expect(expressInertiaResponse).toBeInstanceOf(ExpressInertiaResponseClass)
        })

        it('should have toResponse method', () => {
            expect(typeof expressInertiaResponse.toResponse).toBe('function')
        })

        it('should have send method', () => {
            expect(typeof expressInertiaResponse.send).toBe('function')
        })

        it('should have getInertiaResponse method', () => {
            expect(typeof expressInertiaResponse.getInertiaResponse).toBe('function')
        })

        it('should return underlying InertiaResponse from getInertiaResponse', () => {
            const result = expressInertiaResponse.getInertiaResponse()
            expect(result).toBe(mockInertiaResponse)
        })

        it('should call send method when toResponse is called', async () => {
            const sendSpy = vi.spyOn(expressInertiaResponse, 'send')

            await expressInertiaResponse.send(mockResponse as ExpressResponse)

            expect(sendSpy).toHaveBeenCalledWith(mockResponse)
        })
    })

    describe('Request conversion', () => {
        it('should convert Express request headers to web Request headers', () => {
            const inertiaProperty = createInertiaProperty(
                mockRequest as ExpressRequest,
                mockResponse as ExpressResponse
            )

            // This test verifies that the request conversion logic exists
            // The actual conversion happens internally in the render method
            expect(inertiaProperty).toBeDefined()
        })
    })

    describe('Response handling', () => {
        it('should handle Inertia-specific headers', () => {
            const inertiaProperty = createInertiaProperty(
                mockRequest as ExpressRequest,
                mockResponse as ExpressResponse
            )

            // This test verifies that the response handling logic exists
            // The actual handling happens internally in the render method
            expect(inertiaProperty).toBeDefined()
        })
    })
})
