import type { Context } from 'hono'

export function createMockContext(overrides: Partial<Context> = {}): Context {
    const defaultContext = {
        req: {
            method: 'GET',
            url: 'http://localhost/test',
            header: vi.fn()
        },
        res: {
            status: 200,
            body: null,
            headers: {},
            header: vi.fn()
        },
        header: vi.fn()
    } as any

    return { ...defaultContext, ...overrides }
}

export function createInertiaHeaders(version = 'test-version') {
    return {
        'X-Inertia': 'true',
        'X-Inertia-Version': version
    }
}

export function createNonInertiaHeaders() {
    return {
        'User-Agent': 'Mozilla/5.0'
    }
}
