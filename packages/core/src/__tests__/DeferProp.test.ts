import { describe, it, expect } from 'vitest'
import { DeferProp } from '../props/DeferProp.js'

describe('DeferProp', () => {
    it('should invoke and return the callback value', () => {
        const deferProp = new DeferProp(() => 'A deferred value', 'default')

        expect(deferProp.__invoke()).toBe('A deferred value')
        expect(deferProp.group()).toBe('default')
    })

    it('should handle merge functionality', () => {
        const deferProp = new DeferProp(() => 'A deferred value').merge()

        expect(deferProp.__invoke()).toBe('A deferred value')
        expect(deferProp.shouldMerge()).toBe(true)
    })

    it('should handle deep merge functionality', () => {
        const deferProp = new DeferProp(() => 'A deferred value').deepMerge()

        expect(deferProp.__invoke()).toBe('A deferred value')
        expect(deferProp.shouldMerge()).toBe(true)
        expect(deferProp.shouldDeepMerge()).toBe(true)
    })

    it('should handle match on functionality', () => {
        const deferProp = new DeferProp(() => 'A deferred value').matchOn('id')

        expect(deferProp.__invoke()).toBe('A deferred value')
        expect(deferProp.matchesOn()).toEqual(['id'])
    })

    it('should handle multiple match on values', () => {
        const deferProp = new DeferProp(() => 'A deferred value').matchOn(['id', 'name'])

        expect(deferProp.__invoke()).toBe('A deferred value')
        expect(deferProp.matchesOn()).toEqual(['id', 'name'])
    })

    it('should handle null group', () => {
        const deferProp = new DeferProp(() => 'A deferred value')

        expect(deferProp.group()).toBe(null)
    })

    it('should be callable as a function', () => {
        const deferProp = new DeferProp(() => 'A deferred value')

        expect(deferProp.__invoke()).toBe('A deferred value')
    })
})
