import type { InertiaMiddlewareOptions, ViteOptions } from './types.js';
import { Inertia } from './Inertia.js';
import { VersionDetector } from './VersionDetector.js';

/**
 * Setup Inertia middleware with common configuration
 * This normalizes the setup logic that was previously duplicated across adapters
 */
export function setupInertiaMiddleware(
    options: InertiaMiddlewareOptions = {},
    resolveErrors: () => Record<string, any>
): void {
    // Set Vite options first (needed for version detection)
    const viteOptions: ViteOptions = {
        hotFile: 'hot',
        buildDirectory: 'build',
        manifestFilename: 'manifest.json',
        publicDirectory: 'public',
        entrypoints: ['client/App.tsx'],
        ...options.vite,
    };

    Inertia.setViteOptions(viteOptions);

    // Set version - use automatic detection if not provided and no version is already set
    if (options.version) {
        Inertia.setVersion(options.version);
    } else if (Inertia.getVersion() === undefined) {
        // Only use automatic version detection if no version is already set
        const versionDetector = VersionDetector.createVersionDetector(
            viteOptions.publicDirectory,
            viteOptions,
        );
        Inertia.setVersion(versionDetector);
    }

    // Set shared props
    Inertia.share({
        errors: resolveErrors(),
    });

    // Set root view
    Inertia.setRootView('app');

    // Set SSR options if provided
    if (options.ssr) {
        Inertia.setSsrOptions(options.ssr);
    }
}
