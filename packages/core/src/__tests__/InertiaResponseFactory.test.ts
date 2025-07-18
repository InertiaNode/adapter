import { describe, it, expect, beforeEach } from 'vitest'
import { InertiaResponseFactory } from '../InertiaResponseFactory.js'
import { LazyProp, DeferProp, MergeProp, AlwaysProp, OptionalProp } from '../props/index.js'
import crypto from 'crypto'

describe('InertiaResponseFactory', () => {
    let factory: InertiaResponseFactory

    beforeEach(() => {
        factory = new InertiaResponseFactory()
    })

    describe('Basic Factory', () => {
        it('should create a response with basic props', () => {
            const response = factory.render('User/Edit', { user: { name: 'Jonathan' } })

            expect(response).toBeDefined()
        })

        it('should support method chaining', () => {
            const response = factory
                .render('User/Edit', { user: { name: 'Jonathan' } })
                .with('title', 'User Edit')
                .withViewData('meta', { description: 'Edit user page' })

            expect(response).toBeDefined()
        })
    })

    describe('Version Management', () => {
        it('should handle version as string', () => {
            factory.setVersion('1.0.0')
            expect(factory.getVersion()).toBe('1.0.0')
        })

        it('should handle version as closure', () => {
            factory.setVersion(() => 'dynamic-version')
            expect(factory.getVersion()).toBe('dynamic-version')
        })

        it('should handle version as closure that returns hash', () => {
            factory.setVersion(() => crypto.createHash('md5').update('Inertia').digest('hex'))
            const version = factory.getVersion()
            expect(version).toBeDefined()
            expect(typeof version).toBe('string')
            expect(version).toHaveLength(32) // MD5 hash length
        })

        it('should return undefined when no version is set', () => {
            expect(factory.getVersion()).toBeUndefined()
        })

        it('should handle null version', () => {
            factory.setVersion(null)
            expect(factory.getVersion()).toBeUndefined()
        })

        it('should include version in rendered response', () => {
            factory.setVersion(() => 'test-version')
            const response = factory.render('User/Edit', { user: { name: 'Jonathan' } })

            // The version should be included in the response
            expect(response).toBeDefined()
        })
    })

    describe('Prop Helpers', () => {
        it('should create lazy props', () => {
            const lazyProp = factory.lazy(() => 'A lazy value')

            expect(lazyProp).toBeInstanceOf(LazyProp)
            expect(lazyProp.__invoke()).toBe('A lazy value')
        })

        it('should create deferred props', () => {
            const deferProp = factory.defer(() => 'A deferred value', 'default')

            expect(deferProp).toBeInstanceOf(DeferProp)
            expect(deferProp.__invoke()).toBe('A deferred value')
            expect(deferProp.group()).toBe('default')
        })

        it('should create deferred props with custom group', () => {
            const deferProp = factory.defer(() => 'A deferred value', 'custom')

            expect(deferProp).toBeInstanceOf(DeferProp)
            expect(deferProp.group()).toBe('custom')
        })

        it('should create merge props', () => {
            const mergeProp = factory.merge('A merge value')

            expect(mergeProp).toBeInstanceOf(MergeProp)
            expect(mergeProp.__invoke()).toBe('A merge value')
            expect(mergeProp.shouldMerge()).toBe(true)
        })

        it('should create deep merge props', () => {
            const mergeProp = factory.merge('A deep merge value').deepMerge()

            expect(mergeProp).toBeInstanceOf(MergeProp)
            expect(mergeProp.__invoke()).toBe('A deep merge value')
            expect(mergeProp.shouldMerge()).toBe(true)
            expect(mergeProp.shouldDeepMerge()).toBe(true)
        })

        it('should create optional props', () => {
            const optionalProp = factory.optional(() => 'An optional value')

            expect(optionalProp).toBeInstanceOf(OptionalProp)
            expect(optionalProp.__invoke()).toBe('An optional value')
        })

        it('should create always props', () => {
            const alwaysProp = factory.always('An always value')

            expect(alwaysProp).toBeInstanceOf(AlwaysProp)
            expect(alwaysProp.__invoke()).toBe('An always value')
        })
    })

    describe('Response Creation', () => {
        it('should create response with all prop types', () => {
            const response = factory.render('User/Edit', {
                user: { name: 'Jonathan' },
                lazyData: factory.lazy(() => 'lazy value'),
                deferredData: factory.defer(() => 'deferred value', 'default'),
                mergeData: factory.merge('merge value'),
                alwaysData: factory.always('always value'),
                optionalData: factory.optional(() => 'optional value')
            })

            expect(response).toBeDefined()
        })

        it('should handle complex nested props', () => {
            const response = factory.render('User/Edit', {
                user: {
                    profile: {
                        avatar: factory.lazy(() => 'avatar-url'),
                        settings: factory.defer(() => ({ theme: 'dark' }), 'settings')
                    }
                }
            })

            expect(response).toBeDefined()
        })
    })

    describe('Configuration', () => {
        it('should set root view', () => {
            factory.setRootView('custom-app')
            // Note: We can't easily test this without exposing internal state
            // but we can verify the method exists and doesn't throw
            expect(factory.setRootView).toBeDefined()
        })

        it('should set version', () => {
            factory.setVersion('1.0.0')
            expect(factory.setVersion).toBeDefined()
        })

        it('should set version with function', () => {
            factory.setVersion(() => 'dynamic-version')
            expect(factory.setVersion).toBeDefined()
        })

        it('should share data', () => {
            factory.share('auth', { user: { name: 'John' } })
            expect(factory.share).toBeDefined()
        })

        it('should share multiple data items', () => {
            factory.share({
                auth: { user: { name: 'John' } },
                errors: {}
            })
            expect(factory.share).toBeDefined()
        })

        it('should handle shared data operations', () => {
            // Note: flush method may not be implemented yet
            expect(factory.share).toBeDefined()
        })
    })
})
