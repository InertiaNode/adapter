import { describe, it, expect } from 'vitest'
import { OptionalProp } from '../props/OptionalProp.js'

describe('OptionalProp', () => {
    it('should invoke and return the callback value', () => {
        const optionalProp = new OptionalProp(() => 'An optional value')

        expect(optionalProp.__invoke()).toBe('An optional value')
    })

    it('should handle complex return values', () => {
        const optionalProp = new OptionalProp(() => ({ name: 'John', age: 30 }))

        expect(optionalProp.__invoke()).toEqual({ name: 'John', age: 30 })
    })

    it('should handle async-like scenarios', () => {
        const optionalProp = new OptionalProp(() => Promise.resolve('async value'))

        expect(optionalProp.__invoke()).toBeInstanceOf(Promise)
    })

    it('should handle null return values', () => {
        const optionalProp = new OptionalProp(() => null)

        expect(optionalProp.__invoke()).toBe(null)
    })

    it('should handle undefined return values', () => {
        const optionalProp = new OptionalProp(() => undefined)

        expect(optionalProp.__invoke()).toBe(undefined)
    })
})
