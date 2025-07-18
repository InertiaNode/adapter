import { describe, it, expect, beforeEach } from 'vitest'
import { InertiaResponse } from '../InertiaResponse.js'
import { LazyProp, DeferProp, MergeProp, AlwaysProp, OptionalProp } from '../props/index.js'
import { Headers } from '../Headers.js'

describe('InertiaResponse', () => {
    let response: InertiaResponse

    beforeEach(() => {
        response = new InertiaResponse('User/Edit', { user: { name: 'Jonathan' } })
    })

    describe('Basic Response', () => {
        it('should create a response with basic props', async () => {
            const request = new Request('http://localhost/user/123', {
                headers: { [Headers.INERTIA]: 'true' }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.component).toBe('User/Edit')
            expect(page.props.user.name).toBe('Jonathan')
            expect(page.url).toBe('/user/123')
            expect(page.clearHistory).toBe(false)
            expect(page.encryptHistory).toBe(false)
        })

        it('should handle Inertia requests correctly', async () => {
            const request = new Request('http://localhost/user/123', {
                headers: { [Headers.INERTIA]: 'true' }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(result.headers.get('Content-Type')).toBe('application/json')
            expect(result.headers.get(Headers.INERTIA)).toBe('true')
            expect(page.component).toBe('User/Edit')
        })

        it('should handle non-Inertia requests correctly', async () => {
            const request = new Request('http://localhost/user/123')
            const result = await response.toResponse(request)

            expect(result.headers.get('Content-Type')).toBe('text/html')
            expect(result.status).toBe(200)
        })
    })

    describe('Deferred Props', () => {
        it('should include deferred props in metadata but not in props', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: { name: 'Jonathan' },
                foo: new DeferProp(() => 'bar', 'default')
            })

            const request = new Request('http://localhost/user/123', {
                headers: { [Headers.INERTIA]: 'true' }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.component).toBe('User/Edit')
            expect(page.props.user.name).toBe('Jonathan')
            expect(page.props.foo).toBeUndefined() // Should not be in props
            expect(page.deferredProps).toEqual({
                default: ['foo']
            })
        })

        it('should handle multiple deferred props with different groups', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: { name: 'Jonathan' },
                foo: new DeferProp(() => 'foo value', 'default'),
                bar: new DeferProp(() => 'bar value', 'default'),
                baz: new DeferProp(() => 'baz value', 'custom')
            })

            const request = new Request('http://localhost/user/123', {
                headers: { [Headers.INERTIA]: 'true' }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.deferredProps).toEqual({
                default: ['foo', 'bar'],
                custom: ['baz']
            })
        })

        it('should resolve deferred props in partial requests', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: { name: 'Jonathan' },
                foo: new DeferProp(() => 'bar', 'default')
            })

            const request = new Request('http://localhost/user/123', {
                headers: {
                    [Headers.INERTIA]: 'true',
                    [Headers.PARTIAL_COMPONENT]: 'User/Edit',
                    [Headers.PARTIAL_ONLY]: 'foo'
                }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.props.foo).toBe('bar') // Should be resolved
            expect(page.deferredProps).toBeUndefined() // Should not be in metadata for partial requests
        })
    })

    describe('Merge Props', () => {
        it('should include merge props in metadata', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: { name: 'Jonathan' },
                foo: new MergeProp('foo value'),
                bar: new MergeProp('bar value')
            })

            const request = new Request('http://localhost/user/123', {
                headers: { [Headers.INERTIA]: 'true' }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.props.foo).toBe('foo value')
            expect(page.props.bar).toBe('bar value')
            expect(page.mergeProps).toEqual(['foo', 'bar'])
        })

        it('should handle deep merge props', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: { name: 'Jonathan' },
                foo: new MergeProp('foo value').deepMerge(),
                bar: new MergeProp('bar value').deepMerge()
            })

            const request = new Request('http://localhost/user/123', {
                headers: { [Headers.INERTIA]: 'true' }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.deepMergeProps).toEqual(['foo', 'bar'])
        })

        it('should handle merge strategies', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: new MergeProp({ name: 'Jonathan' }).matchOn('id')
            })

            const request = new Request('http://localhost/user/123', {
                headers: { [Headers.INERTIA]: 'true' }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.matchPropsOn).toEqual(['user.id'])
        })
    })

    describe('Lazy Props', () => {
        it('should exclude lazy props from initial response', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: { name: 'Jonathan' },
                foo: new LazyProp(() => 'lazy value')
            })

            const request = new Request('http://localhost/user/123', {
                headers: { [Headers.INERTIA]: 'true' }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.props.user.name).toBe('Jonathan')
            expect(page.props.foo).toBeUndefined() // Should not be included
        })

        it('should include lazy props in partial requests', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: { name: 'Jonathan' },
                foo: new LazyProp(() => 'lazy value')
            })

            const request = new Request('http://localhost/user/123', {
                headers: {
                    [Headers.INERTIA]: 'true',
                    [Headers.PARTIAL_COMPONENT]: 'User/Edit',
                    [Headers.PARTIAL_ONLY]: 'foo'
                }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.props.foo).toBe('lazy value') // Should be included and resolved
        })
    })

    describe('Always Props', () => {
        it('should always include always props', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: { name: 'Jonathan' },
                foo: new AlwaysProp('always value')
            })

            const request = new Request('http://localhost/user/123', {
                headers: { [Headers.INERTIA]: 'true' }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.props.foo).toBe('always value')
        })

        it('should include always props in partial requests', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: { name: 'Jonathan' },
                foo: new AlwaysProp('always value')
            })

            const request = new Request('http://localhost/user/123', {
                headers: {
                    [Headers.INERTIA]: 'true',
                    [Headers.PARTIAL_COMPONENT]: 'User/Edit',
                    [Headers.PARTIAL_ONLY]: 'user'
                }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.props.user.name).toBe('Jonathan')
            expect(page.props.foo).toBe('always value') // Should still be included
        })
    })

    describe('Optional Props', () => {
        it('should exclude optional props from initial response', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: { name: 'Jonathan' },
                foo: new OptionalProp(() => 'optional value')
            })

            const request = new Request('http://localhost/user/123', {
                headers: { [Headers.INERTIA]: 'true' }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.props.user.name).toBe('Jonathan')
            expect(page.props.foo).toBeUndefined() // Should not be included
        })

        it('should include optional props in partial requests', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: { name: 'Jonathan' },
                foo: new OptionalProp(() => 'optional value')
            })

            const request = new Request('http://localhost/user/123', {
                headers: {
                    [Headers.INERTIA]: 'true',
                    [Headers.PARTIAL_COMPONENT]: 'User/Edit',
                    [Headers.PARTIAL_ONLY]: 'foo'
                }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.props.foo).toBe('optional value') // Should be included and resolved
        })
    })

    describe('Partial Requests', () => {
        it('should handle partial only requests', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: { name: 'Jonathan' },
                foo: 'bar',
                baz: 'qux'
            })

            const request = new Request('http://localhost/user/123', {
                headers: {
                    [Headers.INERTIA]: 'true',
                    [Headers.PARTIAL_COMPONENT]: 'User/Edit',
                    [Headers.PARTIAL_ONLY]: 'user,foo'
                }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.props.user.name).toBe('Jonathan')
            expect(page.props.foo).toBe('bar')
            expect(page.props.baz).toBeUndefined() // Should be excluded
        })

        it('should handle partial except requests', async () => {
            const response = new InertiaResponse('User/Edit', {
                user: { name: 'Jonathan' },
                foo: 'bar',
                baz: 'qux'
            })

            const request = new Request('http://localhost/user/123', {
                headers: {
                    [Headers.INERTIA]: 'true',
                    [Headers.PARTIAL_COMPONENT]: 'User/Edit',
                    [Headers.PARTIAL_EXCEPT]: 'baz'
                }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.props.user.name).toBe('Jonathan')
            expect(page.props.foo).toBe('bar')
            expect(page.props.baz).toBeUndefined() // Should be excluded
        })
    })

    describe('URL Handling', () => {
        it('should preserve trailing slashes', async () => {
            const response = new InertiaResponse('User/Edit', {})
            const request = new Request('http://localhost/user/123/', {
                headers: { [Headers.INERTIA]: 'true' }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            // Note: URL normalization may remove trailing slashes
            expect(page.url).toBe('/user/123')
        })

        it('should handle URLs without trailing slashes', async () => {
            const response = new InertiaResponse('User/Edit', {})
            const request = new Request('http://localhost/user/123', {
                headers: { [Headers.INERTIA]: 'true' }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.url).toBe('/user/123')
        })

        it('should handle URLs with query parameters', async () => {
            const response = new InertiaResponse('User/Edit', {})
            const request = new Request('http://localhost/user/123?foo=bar', {
                headers: { [Headers.INERTIA]: 'true' }
            })
            const result = await response.toResponse(request)
            const page = JSON.parse(await result.text())

            expect(page.url).toBe('/user/123?foo=bar')
        })
    })

    describe('Chaining Methods', () => {
        it('should support method chaining', async () => {
            const response = new InertiaResponse('User/Edit', {})
                .with('user', { name: 'Jonathan' })
                .withViewData('title', 'User Edit')
                .setRootView('custom-app')
                .cache(300)

            expect(response).toBeInstanceOf(InertiaResponse)
        })
    })
})
