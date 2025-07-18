import { describe, it, expect } from 'vitest'
import { LazyProp } from '../props/LazyProp.js'

describe('LazyProp', () => {
    it('should invoke and return the callback value', () => {
        const lazyProp = new LazyProp(() => 'A lazy value')

        expect(lazyProp.__invoke()).toBe('A lazy value')
    })

    it('should be callable as a function', () => {
        const lazyProp = new LazyProp(() => 'A lazy value')

        expect(lazyProp.__invoke()).toBe('A lazy value')
    })

    it('should handle complex return values', () => {
        const lazyProp = new LazyProp(() => ({ name: 'John', age: 30 }))

        expect(lazyProp.__invoke()).toEqual({ name: 'John', age: 30 })
    })

    it('should handle async-like scenarios', () => {
        const lazyProp = new LazyProp(() => Promise.resolve('async value'))

        expect(lazyProp.__invoke()).toBeInstanceOf(Promise)
    })
})
