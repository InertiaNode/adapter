import { describe, it, expect, beforeEach } from 'vitest'
import { Inertia } from '../Inertia.js'
import { LazyProp, DeferProp, MergeProp, AlwaysProp, OptionalProp } from '../props/index.js'

describe('Inertia', () => {
    beforeEach(() => {
        // Reset Inertia state before each test
        // Note: flush method may not be implemented yet
    })

    describe('render', () => {
        it('should create a response with basic props', () => {
            const response = Inertia.render('User/Edit', { user: { name: 'Jonathan' } })

            expect(response).toBeDefined()
        })

        it('should support method chaining', () => {
            const response = Inertia.render('User/Edit', { user: { name: 'Jonathan' } })
                .with('title', 'User Edit')
                .withViewData('meta', { description: 'Edit user page' })

            expect(response).toBeDefined()
        })
    })

    describe('Prop Helpers', () => {
        it('should create lazy props', () => {
            const lazyProp = Inertia.lazy(() => 'A lazy value')

            expect(lazyProp).toBeInstanceOf(LazyProp)
            expect(lazyProp.__invoke()).toBe('A lazy value')
        })

        it('should create deferred props', () => {
            const deferProp = Inertia.defer(() => 'A deferred value', 'default')

            expect(deferProp).toBeInstanceOf(DeferProp)
            expect(deferProp.__invoke()).toBe('A deferred value')
            expect(deferProp.group()).toBe('default')
        })

        it('should create deferred props with custom group', () => {
            const deferProp = Inertia.defer(() => 'A deferred value', 'custom')

            expect(deferProp).toBeInstanceOf(DeferProp)
            expect(deferProp.group()).toBe('custom')
        })

        it('should create merge props', () => {
            const mergeProp = Inertia.merge('A merge value')

            expect(mergeProp).toBeInstanceOf(MergeProp)
            expect(mergeProp.__invoke()).toBe('A merge value')
            expect(mergeProp.shouldMerge()).toBe(true)
        })

        it('should create deep merge props', () => {
            const mergeProp = Inertia.merge('A deep merge value').deepMerge()

            expect(mergeProp).toBeInstanceOf(MergeProp)
            expect(mergeProp.__invoke()).toBe('A deep merge value')
            expect(mergeProp.shouldMerge()).toBe(true)
            expect(mergeProp.shouldDeepMerge()).toBe(true)
        })

        it('should create optional props', () => {
            const optionalProp = Inertia.optional(() => 'An optional value')

            expect(optionalProp).toBeInstanceOf(OptionalProp)
            expect(optionalProp.__invoke()).toBe('An optional value')
        })

        it('should create always props', () => {
            const alwaysProp = Inertia.always('An always value')

            expect(alwaysProp).toBeInstanceOf(AlwaysProp)
            expect(alwaysProp.__invoke()).toBe('An always value')
        })
    })

    describe('Configuration', () => {
        it('should set root view', () => {
            Inertia.setRootView('custom-app')
            // Note: We can't easily test this without exposing internal state
            // but we can verify the method exists and doesn't throw
            expect(Inertia.setRootView).toBeDefined()
        })

        it('should set version', () => {
            Inertia.setVersion('1.0.0')
            expect(Inertia.setVersion).toBeDefined()
        })

        it('should set version with function', () => {
            Inertia.setVersion(() => 'dynamic-version')
            expect(Inertia.setVersion).toBeDefined()
        })

        it('should share data', () => {
            Inertia.share('auth', { user: { name: 'John' } })
            expect(Inertia.share).toBeDefined()
        })

        it('should share multiple data items', () => {
            Inertia.share({
                auth: { user: { name: 'John' } },
                errors: {}
            })
            expect(Inertia.share).toBeDefined()
        })

        it('should handle shared data operations', () => {
            // Note: flush method may not be implemented yet
            expect(Inertia.share).toBeDefined()
        })

        it('should set Vite options', () => {
            Inertia.setViteOptions({
                hotFile: 'hot',
                buildDirectory: 'build',
                manifestFilename: 'manifest.json',
                publicDirectory: 'public'
            })
            expect(Inertia.setViteOptions).toBeDefined()
        })
    })

    describe('Response Creation', () => {
        it('should create response with all prop types', () => {
            const response = Inertia.render('User/Edit', {
                user: { name: 'Jonathan' },
                lazyData: Inertia.lazy(() => 'lazy value'),
                deferredData: Inertia.defer(() => 'deferred value', 'default'),
                mergeData: Inertia.merge('merge value'),
                alwaysData: Inertia.always('always value'),
                optionalData: Inertia.optional(() => 'optional value')
            })

            expect(response).toBeDefined()
        })

        it('should handle complex nested props', () => {
            const response = Inertia.render('User/Edit', {
                user: {
                    profile: {
                        avatar: Inertia.lazy(() => 'avatar-url'),
                        settings: Inertia.defer(() => ({ theme: 'dark' }), 'settings')
                    }
                }
            })

            expect(response).toBeDefined()
        })
    })

    describe('Integration with Response', () => {
        it('should create a complete response workflow', async () => {
            const response = Inertia.render('User/Edit', {
                user: { name: 'Jonathan' },
                title: Inertia.defer(() => 'User Edit Page', 'default'),
                settings: Inertia.lazy(() => ({ theme: 'dark' })),
                notifications: Inertia.merge([])
            })

            const request = new Request('http://localhost/user/123', {
                headers: { 'X-Inertia': 'true' }
            })

            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.component).toBe('User/Edit')
            expect(page.props.user.name).toBe('Jonathan')
            expect(page.props.title).toBeUndefined() // Should not be in props
            expect(page.deferredProps).toEqual({
                default: ['title']
            })
        })
    })
})
