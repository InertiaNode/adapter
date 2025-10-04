import { describe, it, expect, vi } from 'vitest'
import { inertiaKoaAdapter } from '../KoaAdapter.js'
import { createInertiaProperty } from '../KoaResponseExtension.js'
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

describe('Koa Adapter Basic Tests', () => {
    describe('inertiaKoaAdapter', () => {
        it('should return a middleware function', () => {
            const middleware = inertiaKoaAdapter()
            expect(typeof middleware).toBe('function')
        })

        it('should accept options parameter', () => {
            const options = { version: '1.0.0' }
            const middleware = inertiaKoaAdapter(options)
            expect(typeof middleware).toBe('function')
        })

        it('should work with empty options', () => {
            const middleware = inertiaKoaAdapter({})
            expect(typeof middleware).toBe('function')
        })

        it('should work without options', () => {
            const middleware = inertiaKoaAdapter()
            expect(typeof middleware).toBe('function')
        })
    })

    describe('createInertiaProperty', () => {
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

        it('should create an object with required methods', () => {
            const inertia = createInertiaProperty(mockContext)
            
            expect(typeof inertia.render).toBe('function')
            expect(typeof inertia.share).toBe('function')
            expect(typeof inertia.setVersion).toBe('function')
            expect(typeof inertia.getVersion).toBe('function')
            expect(typeof inertia.setRootView).toBe('function')
            expect(typeof inertia.setViteOptions).toBe('function')
            expect(typeof inertia.location).toBe('function')
        })

        it('should call appropriate Inertia methods', () => {
            const inertia = createInertiaProperty(mockContext)
            
            // Test share with object
            const shareData = { key: 'value' }
            inertia.share(shareData)
            expect(Inertia.share).toHaveBeenCalledWith(shareData)

            // Test share with key-value
            inertia.share('testKey', 'testValue')
            expect(Inertia.share).toHaveBeenCalledWith('testKey', 'testValue')

            // Test setVersion
            inertia.setVersion('2.0.0')
            expect(Inertia.setVersion).toHaveBeenCalledWith('2.0.0')

            // Test getVersion
            inertia.getVersion()
            expect(Inertia.getVersion).toHaveBeenCalled()

            // Test setRootView
            inertia.setRootView('customApp')
            expect(Inertia.setRootView).toHaveBeenCalledWith('customApp')

            // Test setViteOptions
            const viteOptions = { dev: true }
            inertia.setViteOptions(viteOptions)
            expect(Inertia.setViteOptions).toHaveBeenCalledWith(viteOptions)

            // Test location
            inertia.location('/test-location')
            expect(Inertia.location).toHaveBeenCalledWith('/test-location')
        })

        it('should handle render method', async () => {
            const mockInertiaResponse = {
                toResponse: vi.fn().mockResolvedValue(new Response('test'))
            }
            vi.mocked(Inertia.render).mockReturnValue(mockInertiaResponse as any)

            const inertia = createInertiaProperty(mockContext)
            
            await inertia.render('TestComponent', { prop: 'value' })
            
            expect(Inertia.render).toHaveBeenCalledWith('TestComponent', { prop: 'value' })
            expect(mockInertiaResponse.toResponse).toHaveBeenCalled()
        })
    })

    describe('Integration', () => {
        it('should work together in typical usage', async () => {
            const middleware = inertiaKoaAdapter({ version: '1.0.0' })
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

            await middleware(mockContext, mockNext)

            expect(mockContext.Inertia).toBeDefined()
            expect(typeof mockContext.Inertia.render).toBe('function')
            expect(mockNext).toHaveBeenCalled()
        })
    })
})