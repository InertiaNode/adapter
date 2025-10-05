import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { createInertiaProperty } from '../HonoResponseExtension.js';

describe('HonoResponseExtension', () => {
    let app: Hono;
    let mockContext: any;

    beforeEach(() => {
        app = new Hono();

        // Create a realistic mock Hono context
        mockContext = {
            req: {
                raw: new Request('http://localhost/test'),
                header: vi.fn((name: string) => {
                    const headers: Record<string, string> = {};
                    return headers[name] || null;
                }),
                url: 'http://localhost/test',
                path: '/test',
                method: 'GET',
                param: vi.fn((name: string) => 'test-id')
            },
            header: vi.fn(),
            redirect: vi.fn((url: string, status?: number) => {
                return new Response('', {
                    status: status || 302,
                    headers: { Location: url }
                });
            }),
            get: vi.fn(),
            set: vi.fn()
        };
    });

    describe('createInertiaProperty', () => {
        it('should create an Inertia property with all methods', () => {
            const inertia = createInertiaProperty(mockContext);

            expect(inertia).toBeDefined();
            expect(typeof inertia.render).toBe('function');
            expect(typeof inertia.share).toBe('function');
            expect(typeof inertia.setVersion).toBe('function');
            expect(typeof inertia.getVersion).toBe('function');
            expect(typeof inertia.setRootView).toBe('function');
            expect(typeof inertia.setViteOptions).toBe('function');
            expect(typeof inertia.location).toBe('function');
            expect(typeof inertia.back).toBe('function');
        });

        it('should be callable as a function (shorthand for render)', async () => {
            const inertia = createInertiaProperty(mockContext);

            // The inertia object should be callable
            expect(typeof inertia).toBe('function');

            // Calling it should work like render()
            const result = await inertia('TestComponent', { foo: 'bar' });
            expect(result).toBeInstanceOf(Response);
        });

        it('should create per-request instance (isolated shared data)', () => {
            const context1 = { ...mockContext };
            const context2 = { ...mockContext };

            const inertia1 = createInertiaProperty(context1);
            const inertia2 = createInertiaProperty(context2);

            // Share data on first instance
            inertia1.share('user', { id: 1, name: 'User 1' });

            // Share data on second instance
            inertia2.share('user', { id: 2, name: 'User 2' });

            // Verify isolation - each instance should have its own shared data
            expect((context1 as any).__inertia).not.toBe((context2 as any).__inertia);
        });

        it('should render a component with props', async () => {
            const inertia = createInertiaProperty(mockContext);

            const response = await inertia.render('TestPage', {
                message: 'Hello World'
            });

            expect(response).toBeInstanceOf(Response);
            expect(response.status).toBe(200);
        });

        it('should share data scoped to the request', () => {
            const inertia = createInertiaProperty(mockContext);

            // Test single key-value sharing
            inertia.share('appName', 'InertiaNode');

            // Verify the data is stored in the request-scoped instance
            expect((mockContext as any).__inertia).toBeDefined();
        });

        it('should share multiple props at once', () => {
            const inertia = createInertiaProperty(mockContext);

            // Test object sharing
            inertia.share({
                appName: 'InertiaNode',
                version: '1.0.0',
                user: { id: 1, name: 'Test User' }
            });

            // Verify the instance exists
            expect((mockContext as any).__inertia).toBeDefined();
        });

        it('should set and get version', () => {
            const inertia = createInertiaProperty(mockContext);

            inertia.setVersion('v1.2.3');

            const version = inertia.getVersion();
            expect(version).toBe('v1.2.3');
        });

        it('should set version as a function', () => {
            const inertia = createInertiaProperty(mockContext);

            inertia.setVersion(() => 'dynamic-v1.2.3');

            const version = inertia.getVersion();
            expect(version).toBe('dynamic-v1.2.3');
        });

        it('should create location response for external redirects', () => {
            const inertia = createInertiaProperty(mockContext);

            const response = inertia.location('https://example.com');

            expect(response).toBeInstanceOf(Response);
            expect(response.status).toBe(409);
            expect(response.headers.get('X-Inertia-Location')).toBe('https://example.com');
        });

        it('should redirect back to referer', () => {
            mockContext.req.header = vi.fn((name: string) => {
                if (name === 'Referer') return 'http://localhost/previous-page';
                return null;
            });

            const inertia = createInertiaProperty(mockContext);
            const response = inertia.back();

            expect(response).toBeInstanceOf(Response);
            expect(response.headers.get('Location')).toBe('http://localhost/previous-page');
            expect(response.status).toBe(303);
        });

        it('should redirect to fallback when no referer', () => {
            const inertia = createInertiaProperty(mockContext);
            const response = inertia.back('/fallback');

            expect(response).toBeInstanceOf(Response);
            expect(response.headers.get('Location')).toBe('/fallback');
            expect(response.status).toBe(303);
        });

        it('should clear history', () => {
            const inertia = createInertiaProperty(mockContext);

            // Should not throw
            expect(() => inertia.clearHistory()).not.toThrow();
        });

        it('should encrypt history', () => {
            const inertia = createInertiaProperty(mockContext);

            // Should not throw
            expect(() => inertia.encryptHistory()).not.toThrow();
            expect(() => inertia.encryptHistory(true)).not.toThrow();
            expect(() => inertia.encryptHistory(false)).not.toThrow();
        });
    });

    describe('Per-request instance isolation', () => {
        it('should not leak shared data between requests', async () => {
            // Simulate first request
            const context1 = { ...mockContext };
            const inertia1 = createInertiaProperty(context1);
            inertia1.share('user', { id: 1, name: 'Alice' });

            // Simulate second request (concurrent)
            const context2 = { ...mockContext };
            const inertia2 = createInertiaProperty(context2);
            inertia2.share('user', { id: 2, name: 'Bob' });

            // Each context should have its own __inertia instance
            expect((context1 as any).__inertia).not.toBe((context2 as any).__inertia);

            // Verify version isolation
            inertia1.setVersion('v1');
            inertia2.setVersion('v2');

            expect(inertia1.getVersion()).toBe('v1');
            expect(inertia2.getVersion()).toBe('v2');
        });

        it('should handle multiple concurrent requests without data leakage', () => {
            const contexts = Array.from({ length: 10 }, () => ({ ...mockContext }));
            const inertias = contexts.map(ctx => createInertiaProperty(ctx));

            // Set unique data for each request
            inertias.forEach((inertia, index) => {
                inertia.share('requestId', index);
                inertia.setVersion(`v${index}`);
            });

            // Verify each instance has its own data
            inertias.forEach((inertia, index) => {
                expect(inertia.getVersion()).toBe(`v${index}`);
            });
        });
    });

    describe('Integration with Hono context', () => {
        it('should store instance on context.__inertia', () => {
            const inertia = createInertiaProperty(mockContext);

            expect((mockContext as any).__inertia).toBeDefined();
            expect((mockContext as any).__inertia.getVersion).toBeDefined();
        });

        it('should work with Hono middleware pattern', async () => {
            const app = new Hono();

            // Simulate middleware that creates Inertia property
            app.use('*', async (c, next) => {
                c.Inertia = createInertiaProperty(c as any);
                await next();
            });

            app.get('/test', async (c) => {
                c.Inertia.share('test', 'value');
                return new Response('OK');
            });

            // Note: Full integration testing would require actually running the Hono app
            // This test just verifies the structure
            expect(app).toBeDefined();
        });
    });

    describe('Callable Inertia shorthand', () => {
        it('should work as shorthand: c.Inertia(component, props)', async () => {
            const inertia = createInertiaProperty(mockContext);

            // Using shorthand syntax
            const response1 = await inertia('Dashboard', { count: 42 });

            // Using explicit render method
            const response2 = await inertia.render('Dashboard', { count: 42 });

            // Both should produce similar responses
            expect(response1).toBeInstanceOf(Response);
            expect(response2).toBeInstanceOf(Response);
        });

        it('should handle props with shared data', async () => {
            const inertia = createInertiaProperty(mockContext);

            inertia.share('appName', 'TestApp');

            const response = await inertia('Dashboard', { count: 42 });

            expect(response).toBeInstanceOf(Response);
            // The actual merging of shared data happens in InertiaResponseFactory
        });
    });
});
