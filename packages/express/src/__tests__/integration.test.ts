import { describe, it, expect, beforeEach, vi } from 'vitest'
import express from 'express'
import { inertiaExpressAdapter } from '../ExpressAdapter.js'
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

describe('Express Adapter Integration', () => {
    let app: express.Application

    beforeEach(() => {
        vi.clearAllMocks()
        app = express()
    })

    describe('Middleware Integration', () => {
        it('should add Inertia property to response object', async () => {
            app.use(inertiaExpressAdapter())

            app.get('/test', (req, res) => {
                expect(res.Inertia).toBeDefined()
                expect(typeof res.Inertia.render).toBe('function')
                expect(typeof res.Inertia.share).toBe('function')
                expect(typeof res.Inertia.setVersion).toBe('function')
                expect(typeof res.Inertia.getVersion).toBe('function')
                expect(typeof res.Inertia.setRootView).toBe('function')
                expect(typeof res.Inertia.setViteOptions).toBe('function')
                expect(typeof res.Inertia.location).toBe('function')

                res.status(200).json({ success: true })
            })

            const response = await request(app).get('/test') as any
            expect(response.status).toBe(200)
        })

        it('should handle Inertia render requests', () => {
            const mockInertiaResponse = {
                toResponse: vi.fn().mockResolvedValue(new Response('test response', {
                    status: 200,
                    headers: { 'Content-Type': 'text/html' }
                }))
            }
            vi.mocked(Inertia.render).mockReturnValue(mockInertiaResponse as any)

            // Trigger the route
            const mockReq = { 
                params: { id: '123' }, 
                method: 'GET', 
                url: '/users/123',
                headers: {},
                get: vi.fn().mockReturnValue(undefined) 
            } as any
            const mockRes = { 
                Inertia: undefined,
                setHeader: vi.fn(),
                status: vi.fn().mockReturnThis(),
                send: vi.fn()
            } as any
            
            // Manually call the middleware and route
            const middleware = inertiaExpressAdapter()
            middleware(mockReq, mockRes, () => {
                if (mockRes.Inertia) {
                    mockRes.Inertia.render('Users/Show', { userId: '123' })
                    expect(Inertia.render).toHaveBeenCalledWith('Users/Show', { userId: '123' })
                }
            })
        })

        it('should handle shared data', async () => {
            app.use(inertiaExpressAdapter())

            app.get('/test', (req, res) => {
                res.Inertia.share('auth', { user: { name: 'John' } })
                res.Inertia.share('errors', {})

                expect(Inertia.share).toHaveBeenCalledWith('auth', { user: { name: 'John' } })
                expect(Inertia.share).toHaveBeenCalledWith('errors', {})

                res.status(200).json({ success: true })
            })

            await request(app).get('/test')
        })

        it('should handle version setting', async () => {
            app.use(inertiaExpressAdapter())

            app.get('/test', (req, res) => {
                res.Inertia.setVersion('1.0.0')
                res.Inertia.setVersion(() => 'dynamic-version')

                expect(Inertia.setVersion).toHaveBeenCalledWith('1.0.0')
                expect(Inertia.setVersion).toHaveBeenCalledWith(expect.any(Function))

                res.status(200).json({ success: true })
            })

            await request(app).get('/test')
        })

        it('should handle root view setting', async () => {
            app.use(inertiaExpressAdapter())

            app.get('/test', (req, res) => {
                res.Inertia.setRootView('custom-app')

                expect(Inertia.setRootView).toHaveBeenCalledWith('custom-app')

                res.status(200).json({ success: true })
            })

            await request(app).get('/test')
        })

        it('should handle Vite options setting', async () => {
            app.use(inertiaExpressAdapter())

            app.get('/test', (req, res) => {
                const viteOptions = {
                    hotFile: 'hot',
                    buildDirectory: 'build',
                    manifestFilename: 'manifest.json',
                    publicDirectory: 'public'
                }

                res.Inertia.setViteOptions(viteOptions)

                expect(Inertia.setViteOptions).toHaveBeenCalledWith(viteOptions)

                res.status(200).json({ success: true })
            })

            await request(app).get('/test')
        })

        it('should handle location redirects', async () => {
            app.use(inertiaExpressAdapter())

            app.get('/test', (req, res) => {
                res.Inertia.location('/redirect-url')

                expect(Inertia.location).toHaveBeenCalledWith('/redirect-url')

                res.status(200).json({ success: true })
            })

            await request(app).get('/test')
        })
    })

    describe('Middleware Options', () => {
        it('should pass options to setupInertiaMiddleware', async () => {
            const options = {
                rootView: 'custom-app',
                version: '2.0.0'
            }

            app.use(inertiaExpressAdapter(options))

            app.get('/test', (req, res) => {
                res.status(200).json({ success: true })
            })

            await request(app).get('/test')

            // Verify that setupInertiaMiddleware was called with the options
            const { setupInertiaMiddleware } = await import('@inertianode/core')
            expect(setupInertiaMiddleware).toHaveBeenCalledWith(options, expect.any(Function))
        })

        it('should use default options when none provided', async () => {
            app.use(inertiaExpressAdapter())

            app.get('/test', (req, res) => {
                res.status(200).json({ success: true })
            })

            await request(app).get('/test')

            // Verify that setupInertiaMiddleware was called with empty options
            const { setupInertiaMiddleware } = await import('@inertianode/core')
            expect(setupInertiaMiddleware).toHaveBeenCalledWith({}, expect.any(Function))
        })
    })

    describe('Error Handling', () => {
        it('should handle middleware errors gracefully', async () => {
            // Mock setupInertiaMiddleware to throw an error
            const { setupInertiaMiddleware } = await import('@inertianode/core')
            vi.mocked(setupInertiaMiddleware).mockImplementation(() => {
                throw new Error('Setup failed')
            })

            app.use(inertiaExpressAdapter())

            app.get('/test', (req, res) => {
                res.status(200).json({ success: true })
            })

            // The middleware should throw an error
            await expect(request(app).get('/test')).rejects.toThrow()
        })
    })
})

// Helper function to make requests to the Express app
function request(app: express.Application) {
    return {
        get: async (url: string, headers: Record<string, string> = {}) => {
            return new Promise((resolve, reject) => {
                const req = {
                    method: 'GET',
                    url,
                    headers: {
                        'host': 'localhost:3000',
                        ...headers
                    }
                } as any

                const res = {
                    status: (code: number) => ({
                        json: (data: any) => resolve({ status: code, data }),
                        send: (data: any) => resolve({ status: code, data })
                    }),
                    setHeader: vi.fn(),
                    send: (data: any) => resolve({ status: 200, data }),
                    redirect: vi.fn(),
                    end: vi.fn()
                } as any

                app(req, res, (err: any) => {
                    if (err) reject(err)
                    else resolve({ status: 200, data: null })
                })
            })
        }
    }
}
