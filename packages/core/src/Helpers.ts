import { Headers } from "./Headers.js"
import type { Page } from "./types.js"

// Utility function to check if request is Inertia request
export function isInertiaRequest(request: Request): boolean {
    return request.headers.get(Headers.INERTIA) === 'true'
}

// Utility function to get Inertia page from request
export function getInertiaPage(request: Request): Page | null {
    const contentType = request.headers.get('Content-Type')
    if (contentType?.includes('application/json')) {
        // This would parse the JSON body
        // For now, return null
        return null
    }
    return null
}
