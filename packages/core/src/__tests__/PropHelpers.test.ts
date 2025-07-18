import { describe, it, expect } from 'vitest'
import { lazy, defer, merge, always, optional } from '../PropHelpers.js'
import { LazyProp, DeferProp, MergeProp, AlwaysProp, OptionalProp } from '../props/index.js'

describe('PropHelpers', () => {
    describe('lazy', () => {
        it('should create a LazyProp instance', () => {
            const lazyProp = lazy(() => 'A lazy value')

            expect(lazyProp).toBeInstanceOf(LazyProp)
            expect(lazyProp.__invoke()).toBe('A lazy value')
        })

        it('should handle complex return values', () => {
            const lazyProp = lazy(() => ({ name: 'John', age: 30 }))

            expect(lazyProp).toBeInstanceOf(LazyProp)
            expect(lazyProp.__invoke()).toEqual({ name: 'John', age: 30 })
        })
    })

    describe('defer', () => {
        it('should create a DeferProp instance with default group', () => {
            const deferProp = defer(() => 'A deferred value')

            expect(deferProp).toBeInstanceOf(DeferProp)
            expect(deferProp.__invoke()).toBe('A deferred value')
            expect(deferProp.group()).toBe(null)
        })

        it('should create a DeferProp instance with custom group', () => {
            const deferProp = defer(() => 'A deferred value', 'custom')

            expect(deferProp).toBeInstanceOf(DeferProp)
            expect(deferProp.__invoke()).toBe('A deferred value')
            expect(deferProp.group()).toBe('custom')
        })

        it('should handle complex return values', () => {
            const deferProp = defer(() => ({ user: { name: 'John' } }), 'users')

            expect(deferProp).toBeInstanceOf(DeferProp)
            expect(deferProp.__invoke()).toEqual({ user: { name: 'John' } })
            expect(deferProp.group()).toBe('users')
        })
    })

    describe('merge', () => {
        it('should create a MergeProp instance', () => {
            const mergeProp = merge('A merge value')

            expect(mergeProp).toBeInstanceOf(MergeProp)
            expect(mergeProp.__invoke()).toBe('A merge value')
            expect(mergeProp.shouldMerge()).toBe(true)
        })

        it('should handle complex values', () => {
            const complexValue = { user: { name: 'John', age: 30 } }
            const mergeProp = merge(complexValue)

            expect(mergeProp).toBeInstanceOf(MergeProp)
            expect(mergeProp.__invoke()).toEqual(complexValue)
            expect(mergeProp.shouldMerge()).toBe(true)
        })

        it('should support chaining with deepMerge', () => {
            const mergeProp = merge('A merge value').deepMerge()

            expect(mergeProp).toBeInstanceOf(MergeProp)
            expect(mergeProp.__invoke()).toBe('A merge value')
            expect(mergeProp.shouldMerge()).toBe(true)
            expect(mergeProp.shouldDeepMerge()).toBe(true)
        })

        it('should support chaining with matchOn', () => {
            const mergeProp = merge('A merge value').matchOn('id')

            expect(mergeProp).toBeInstanceOf(MergeProp)
            expect(mergeProp.__invoke()).toBe('A merge value')
            expect(mergeProp.matchesOn()).toEqual(['id'])
        })
    })

    describe('always', () => {
        it('should create an AlwaysProp instance', () => {
            const alwaysProp = always('An always value')

            expect(alwaysProp).toBeInstanceOf(AlwaysProp)
            expect(alwaysProp.__invoke()).toBe('An always value')
        })

        it('should handle complex values', () => {
            const complexValue = { user: { name: 'John', age: 30 } }
            const alwaysProp = always(complexValue)

            expect(alwaysProp).toBeInstanceOf(AlwaysProp)
            expect(alwaysProp.__invoke()).toEqual(complexValue)
        })

        it('should handle function values', () => {
            const alwaysProp = always(() => 'function value')

            expect(alwaysProp).toBeInstanceOf(AlwaysProp)
            expect(alwaysProp.__invoke()).toBe('function value')
        })
    })

    describe('optional', () => {
        it('should create an OptionalProp instance', () => {
            const optionalProp = optional(() => 'An optional value')

            expect(optionalProp).toBeInstanceOf(OptionalProp)
            expect(optionalProp.__invoke()).toBe('An optional value')
        })

        it('should handle complex return values', () => {
            const optionalProp = optional(() => ({ name: 'John', age: 30 }))

            expect(optionalProp).toBeInstanceOf(OptionalProp)
            expect(optionalProp.__invoke()).toEqual({ name: 'John', age: 30 })
        })

        it('should handle null return values', () => {
            const optionalProp = optional(() => null)

            expect(optionalProp).toBeInstanceOf(OptionalProp)
            expect(optionalProp.__invoke()).toBe(null)
        })
    })

    describe('Integration', () => {
        it('should work together in a response context', () => {
            const props = {
                user: { name: 'Jonathan' },
                lazyData: lazy(() => 'lazy value'),
                deferredData: defer(() => 'deferred value', 'default'),
                mergeData: merge('merge value'),
                alwaysData: always('always value'),
                optionalData: optional(() => 'optional value')
            }

            expect(props.lazyData).toBeInstanceOf(LazyProp)
            expect(props.deferredData).toBeInstanceOf(DeferProp)
            expect(props.mergeData).toBeInstanceOf(MergeProp)
            expect(props.alwaysData).toBeInstanceOf(AlwaysProp)
            expect(props.optionalData).toBeInstanceOf(OptionalProp)

            expect(props.lazyData.__invoke()).toBe('lazy value')
            expect(props.deferredData.__invoke()).toBe('deferred value')
            expect(props.mergeData.__invoke()).toBe('merge value')
            expect(props.alwaysData.__invoke()).toBe('always value')
            expect(props.optionalData.__invoke()).toBe('optional value')
        })
    })
})
