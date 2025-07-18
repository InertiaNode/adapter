import { describe, it, expect } from 'vitest'
import { Headers } from '../Headers.js'

describe('Headers', () => {
    it('should export all required Inertia headers', () => {
        expect(Headers.INERTIA).toBe('X-Inertia')
        expect(Headers.ERROR_BAG).toBe('X-Inertia-Error-Bag')
        expect(Headers.LOCATION).toBe('X-Inertia-Location')
        expect(Headers.VERSION).toBe('X-Inertia-Version')
        expect(Headers.PARTIAL_COMPONENT).toBe('X-Inertia-Partial-Component')
        expect(Headers.PARTIAL_ONLY).toBe('X-Inertia-Partial-Data')
        expect(Headers.PARTIAL_EXCEPT).toBe('X-Inertia-Partial-Except')
        expect(Headers.RESET).toBe('X-Inertia-Reset')
    })

    it('should be readonly', () => {
        expect(Object.isFrozen(Headers)).toBe(true)
    })

    it('should match Inertia.js specification', () => {
        // These values should match the official Inertia.js specification
        const expectedHeaders = {
            INERTIA: 'X-Inertia',
            ERROR_BAG: 'X-Inertia-Error-Bag',
            LOCATION: 'X-Inertia-Location',
            VERSION: 'X-Inertia-Version',
            PARTIAL_COMPONENT: 'X-Inertia-Partial-Component',
            PARTIAL_ONLY: 'X-Inertia-Partial-Data',
            PARTIAL_EXCEPT: 'X-Inertia-Partial-Except',
            RESET: 'X-Inertia-Reset'
        }

        Object.entries(expectedHeaders).forEach(([key, value]) => {
            expect(Headers[key as keyof typeof Headers]).toBe(value)
        })
    })
})
