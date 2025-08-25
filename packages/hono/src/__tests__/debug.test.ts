import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { inertiaHonoAdapter } from '../HonoAdapter.js'
import { Inertia } from '@inertianode/core'

describe('Debug Test', () => {
    let app: Hono

    beforeEach(() => {
        app = new Hono()
        Inertia.setVersion('test-version')
    })

    it('should debug version change', async () => {
        app.use('*', inertiaHonoAdapter())

        app.get('/test', (c) => {
            return c.text('Hello World')
        })

        const res = await app.fetch(new Request('http://localhost/test', {
            headers: {
                'X-Inertia': 'true',
                'X-Inertia-Version': 'old-version'
            }
        }))

        expect(res.status).toBe(409)
    })

    it('should debug empty response', async () => {
        app.use('*', inertiaHonoAdapter())

        app.get('/test', (c) => {
            return c.text('') // Empty response
        })

        const res = await app.fetch(new Request('http://localhost/test', {
            headers: {
                'X-Inertia': 'true',
                'X-Inertia-Version': 'test-version'
            }
        }))

        expect(res.status).toBe(409)
    })

    it('should debug redirect', async () => {
        app.use('*', inertiaHonoAdapter())

        app.put('/test', (c) => {
            return c.redirect('/redirected', 302)
        })

        const res = await app.fetch(new Request('http://localhost/test', {
            method: 'PUT',
            headers: {
                'X-Inertia': 'true',
                'X-Inertia-Version': 'test-version'
            }
        }))

        expect(res.status).toBe(303)
    })
})
