import { describe, it, expect } from 'vitest'
import { AlwaysProp } from '../props/AlwaysProp.js'

describe('AlwaysProp', () => {
    it('should store the value and be callable', () => {
        const alwaysProp = new AlwaysProp('always value')

        expect(alwaysProp.__invoke()).toBe('always value')
    })

    it('should handle complex values', () => {
        const complexValue = { user: { name: 'John', age: 30 } }
        const alwaysProp = new AlwaysProp(complexValue)

        expect(alwaysProp.__invoke()).toEqual(complexValue)
    })

    it('should handle function values', () => {
        const alwaysProp = new AlwaysProp(() => 'function value')

        expect(alwaysProp.__invoke()).toBe('function value')
    })

    it('should handle null values', () => {
        const alwaysProp = new AlwaysProp(null)

        expect(alwaysProp.__invoke()).toBe(null)
    })

    it('should handle undefined values', () => {
        const alwaysProp = new AlwaysProp(undefined)

        expect(alwaysProp.__invoke()).toBe(undefined)
    })
})
