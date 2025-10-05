import fs from 'fs';
import path from 'path';
import type { ViteOptions } from './types.js';

/**
 * Vite helper class for managing Vite assets in Inertia applications
 * Similar to Laravel's Vite class
 */
export class Vite {
    /**
     * Default Vite options used across the application
     */
    public static defaultOptions: ViteOptions = {
        hotFile: 'hot',
        buildDirectory: 'build',
        manifestFilename: 'manifest.json',
        publicDirectory: 'public',
        entrypoints: ['client/App.tsx'],
        reactRefresh: false
    };

    private static manifestCache: Record<string, any> | null = null;

    /**
     * Check if running in development mode by checking for hot file
     */
    static isRunningHot(options?: Partial<ViteOptions>): boolean {
        const opts = { ...this.defaultOptions, ...(options || {}) };
        const hotFilePath = path.join(process.cwd(), opts.publicDirectory, opts.hotFile);
        return fs.existsSync(hotFilePath);
    }

    /**
     * Get the hot URL from the hot file
     */
    static hotUrl(options?: Partial<ViteOptions>): string | null {
        const opts = { ...this.defaultOptions, ...(options || {}) };
        const hotFilePath = path.join(process.cwd(), opts.publicDirectory, opts.hotFile);

        if (fs.existsSync(hotFilePath)) {
            return fs.readFileSync(hotFilePath, 'utf8').trim();
        }

        return null;
    }

    /**
     * Load and cache the Vite manifest file
     */
    static manifest(options?: Partial<ViteOptions>): Record<string, any> | null {
        if (this.manifestCache) {
            return this.manifestCache;
        }

        const opts = { ...this.defaultOptions, ...(options || {}) };
        const manifestPath = path.join(
            process.cwd(),
            opts.publicDirectory,
            opts.buildDirectory,
            opts.manifestFilename
        );

        if (fs.existsSync(manifestPath)) {
            this.manifestCache = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            return this.manifestCache;
        }

        return null;
    }

    /**
     * Get asset information from the manifest
     */
    static asset(entrypoint: string, options?: Partial<ViteOptions>): any | null {
        const manifest = this.manifest(options);
        return manifest?.[entrypoint] || null;
    }

    /**
     * Generate Vite asset tags for development or production
     */
    static makeTag(entrypoints: string | string[], options?: Partial<ViteOptions>): string {
        const opts = { ...this.defaultOptions, ...(options || {}) };
        const entrypointArray = Array.isArray(entrypoints) ? entrypoints : [entrypoints];

        const isDev = this.isRunningHot(options);
        const hot = this.hotUrl(options) || 'http://localhost:5173';
        const manifest = this.manifest(options);

        return this.generateAssetTags(isDev, hot, manifest, { ...opts, entrypoints: entrypointArray });
    }

    /**
     * Generate React Fast Refresh script tag for development
     * Use this if you want to manually add React refresh to your template
     * Alternatively, set reactRefresh: true in Vite options to include it automatically
     */
    static reactRefresh(options?: Partial<ViteOptions>): string {
        const hot = this.hotUrl(options) || 'http://localhost:5173';

        return `
    <script type="module">
        import RefreshRuntime from '${hot}/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
    </script>`;
    }

    /**
     * Generate asset tags for development or production
     */
    private static generateAssetTags(
        isDevelopment: boolean,
        hotUrl: string,
        manifest: any,
        viteOptions: ViteOptions
    ): string {
        if (isDevelopment) {
            // Development mode - use Vite dev server
            const entrypoints = viteOptions.entrypoints || ['client/App.tsx'];

            let devScripts = `
    <!-- Development mode scripts -->
    <script type="module" src="${hotUrl}/@vite/client"></script>`;

            // Add React refresh only if explicitly enabled
            if (viteOptions.reactRefresh) {
                devScripts += `
    <script type="module">
        import RefreshRuntime from '${hotUrl}/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
    </script>`;
            }

            // Add entrypoint scripts
            for (const entrypoint of entrypoints) {
                devScripts += `
    <script type="module" src="${hotUrl}/${entrypoint}"></script>`;
            }

            return devScripts;
        } else {
            // Production mode - load from manifest
            if (!manifest) {
                console.warn('No manifest file found for production assets');
                return '';
            }

            const assetTags: string[] = [];
            const entrypoints = viteOptions.entrypoints || ['client/App.tsx'];

            // If specific entrypoints are defined, load only those
            if (entrypoints.length > 0) {
                for (const entrypoint of entrypoints) {
                    const asset = manifest[entrypoint];
                    if (asset && typeof asset === 'object') {
                        // Add CSS files for this entrypoint
                        if ('css' in asset) {
                            const cssFiles = Array.isArray(asset.css) ? asset.css : [asset.css];
                            for (const cssFile of cssFiles) {
                                if (cssFile) {
                                    assetTags.push(`<link rel="stylesheet" href="/${viteOptions.buildDirectory}/${cssFile}">`);
                                }
                            }
                        }

                        // Add JS file for this entrypoint
                        if ('file' in asset) {
                            assetTags.push(`<script type="module" src="/${viteOptions.buildDirectory}/${asset.file}"></script>`);
                        }

                        // Add any imports for this entrypoint
                        if ('imports' in asset && Array.isArray(asset.imports)) {
                            for (const importFile of asset.imports) {
                                const importAsset = manifest[importFile];
                                if (importAsset && typeof importAsset === 'object' && 'file' in importAsset) {
                                    assetTags.push(`<link rel="modulepreload" href="/${viteOptions.buildDirectory}/${importAsset.file}">`);
                                }
                            }
                        }
                    }
                }
            } else {
                // Fallback: load all assets from manifest (legacy behavior)
                // Add CSS files
                for (const [, asset] of Object.entries(manifest)) {
                    if (typeof asset === 'object' && asset !== null && 'css' in asset) {
                        const cssFiles = Array.isArray(asset.css) ? asset.css : [asset.css];
                        for (const cssFile of cssFiles) {
                            if (cssFile) {
                                assetTags.push(`<link rel="stylesheet" href="/${viteOptions.buildDirectory}/${cssFile}">`);
                            }
                        }
                    }
                }

                // Add JS files
                for (const [, asset] of Object.entries(manifest)) {
                    if (typeof asset === 'object' && asset !== null && 'file' in asset) {
                        assetTags.push(`<script type="module" src="/${viteOptions.buildDirectory}/${asset.file}"></script>`);
                    }
                }
            }

            return assetTags.join('\n    ');
        }
    }

    /**
     * Clear the manifest cache (useful for testing)
     */
    static clearManifestCache(): void {
        this.manifestCache = null;
    }
}
