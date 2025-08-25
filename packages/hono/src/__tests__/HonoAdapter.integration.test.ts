import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { inertiaHonoAdapter } from '../HonoAdapter.js'
import { Inertia } from '@inertianode/core'

describe('HonoAdapter Integration', () => {
    let app: Hono

    beforeEach(() => {
        app = new Hono()

        // Reset Inertia state
        Inertia.setVersion('test-version')
        Inertia.setRootView('app')
        Inertia.share({
            errors: {},
            auth: { user: null }
        })
    })

    describe('basic middleware integration', () => {
        it('should work with Hono app', async () => {
            app.use('*', inertiaHonoAdapter())

            app.get('/test', (c) => {
                return c.text('Hello World')
            })

            const res = await app.request('/test')
            expect(res.status).toBe(200)
            expect(await res.text()).toBe('Hello World')
        })

        it('should set Vary header', async () => {
            app.use('*', inertiaHonoAdapter())

            app.get('/test', (c) => {
                return c.text('Hello World')
            })

            const res = await app.request('/test')
            expect(res.headers.get('Vary')).toBe('X-Inertia')
        })
    })

    describe('Inertia request handling', () => {
        it('should handle Inertia requests', async () => {
            app.use('*', inertiaHonoAdapter())

            app.get('/test', (c) => {
                return c.text('Hello World')
            })

            const res = await app.request('/test', {
                headers: {
                    'X-Inertia': 'true'
                }
            })

            expect(res.status).toBe(200)
        })

        it('should handle version changes', async () => {
            app.use('*', inertiaHonoAdapter())

            app.get('/test', (c) => {
                return c.text('Hello World')
            })

            const res = await app.request('/test', {
                headers: {
                    'X-Inertia': 'true',
                    'X-Inertia-Version': 'old-version'
                }
            })

            expect(res.status).toBe(409)
        })

        it('should handle empty responses for Inertia requests', async () => {
            app.use('*', inertiaHonoAdapter())

            app.get('/test', (c) => {
                return c.text('') // Empty response
            })

            const res = await app.request('/test', {
                headers: {
                    'X-Inertia': 'true',
                    'X-Inertia-Version': 'test-version'
                }
            })

            expect(res.status).toBe(409)
        })
    })

    describe('redirect handling', () => {
        it('should change redirect status for PUT requests', async () => {
            app.use('*', inertiaHonoAdapter())

            app.put('/test', (c) => {
                return c.redirect('/redirected', 302)
            })

            const res = await app.request('/test', {
                method: 'PUT',
                headers: {
                    'X-Inertia': 'true',
                    'X-Inertia-Version': 'test-version'
                }
            })

            expect(res.status).toBe(303)
        })

        it('should change redirect status for PATCH requests', async () => {
            app.use('*', inertiaHonoAdapter())

            app.patch('/test', (c) => {
                return c.redirect('/redirected', 302)
            })

            const res = await app.request('/test', {
                method: 'PATCH',
                headers: {
                    'X-Inertia': 'true',
                    'X-Inertia-Version': 'test-version'
                }
            })

            expect(res.status).toBe(303)
        })

        it('should change redirect status for DELETE requests', async () => {
            app.use('*', inertiaHonoAdapter())

            app.delete('/test', (c) => {
                return c.redirect('/redirected', 302)
            })

            const res = await app.request('/test', {
                method: 'DELETE',
                headers: {
                    'X-Inertia': 'true',
                    'X-Inertia-Version': 'test-version'
                }
            })

            expect(res.status).toBe(303)
        })

        it('should not change redirect status for GET requests', async () => {
            app.use('*', inertiaHonoAdapter())

            app.get('/test', (c) => {
                return c.redirect('/redirected', 302)
            })

            const res = await app.request('/test', {
                headers: {
                    'X-Inertia': 'true',
                    'X-Inertia-Version': 'test-version'
                }
            })

            expect(res.status).toBe(302)
        })
    })

    describe('middleware options', () => {
        it('should handle custom version', async () => {
            app.use('*', inertiaHonoAdapter({ version: 'custom-version' }))

            app.get('/test', (c) => {
                return c.text('Hello World')
            })

            const res = await app.request('/test', {
                headers: {
                    'X-Inertia': 'true',
                    'X-Inertia-Version': 'custom-version'
                }
            })

            expect(res.status).toBe(200)
        })

        it('should handle custom vite options', async () => {
            app.use('*', inertiaHonoAdapter({
                vite: {
                    hotFile: 'custom-hot',
                    buildDirectory: 'custom-build',
                    manifestFilename: 'custom-manifest.json',
                    publicDirectory: 'custom-public'
                }
            }))

            app.get('/test', (c) => {
                return c.text('Hello World')
            })

            const res = await app.request('/test')
            expect(res.status).toBe(200)
        })
    })

    describe('error handling', () => {
        it('should handle middleware errors gracefully', async () => {
            app.use('*', inertiaHonoAdapter())

            app.get('/test', (c) => {
                throw new Error('Route error')
            })

            const res = await app.request('/test')
            expect(res.status).toBe(500)
        })

        it('should handle async errors', async () => {
            app.use('*', inertiaHonoAdapter())

            app.get('/test', async (c) => {
                throw new Error('Async error')
            })

            const res = await app.request('/test')
            expect(res.status).toBe(500)
        })
    })

    describe('complex scenarios', () => {
        it('should handle multiple middleware layers', async () => {
            app.use('*', inertiaHonoAdapter())

            // Add another middleware
            app.use('*', async (c, next) => {
                c.header('X-Custom-Header', 'test')
                await next()
            })

            app.get('/test', (c) => {
                return c.text('Hello World')
            })

            const res = await app.request('/test')
            expect(res.status).toBe(200)
            expect(res.headers.get('X-Custom-Header')).toBe('test')
            expect(res.headers.get('Vary')).toBe('X-Inertia')
        })

        it('should handle nested routes', async () => {
            app.use('*', inertiaHonoAdapter())

            const api = new Hono()
            api.get('/users', (c) => c.json({ users: [] }))

            app.route('/api', api)
            app.get('/test', (c) => c.text('Hello World'))

            const res = await app.request('/api/users')
            expect(res.status).toBe(200)
            expect(res.headers.get('Vary')).toBe('X-Inertia')
        })
    })
})
