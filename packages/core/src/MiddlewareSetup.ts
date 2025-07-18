import type { InertiaMiddlewareOptions } from './types.js';
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
    const viteOptions = options.vite || {
        hotFile: 'hot',
        buildDirectory: 'build',
        manifestFilename: 'manifest.json',
        publicDirectory: 'public',
    };

    Inertia.setViteOptions(viteOptions);

    // Set version - use automatic detection if not provided
    if (options.version) {
        Inertia.setVersion(options.version);
    } else {
        // Use automatic version detection based on Vite options
        const versionDetector = VersionDetector.createVersionDetector(
            viteOptions.publicDirectory,
            {
                hotFile: viteOptions.hotFile,
                buildDirectory: viteOptions.buildDirectory,
                manifestFilename: viteOptions.manifestFilename,
            }
        );
        Inertia.setVersion(versionDetector);
    }

    // Set shared props
    Inertia.share({
        errors: resolveErrors(),
    });

    // Set root view
    Inertia.setRootView('app');
}
