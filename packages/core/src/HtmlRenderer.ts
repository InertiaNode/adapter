import type { HtmlTemplateOptions, Page, ViteOptions } from './types.js'
import { Vite } from './Vite.js';

/**
 * Check if running in development mode by checking for hot file
 * @deprecated Use Vite.isRunningHot() instead
 */
export function isDevelopmentMode(viteOptions?: Partial<ViteOptions>): boolean {
    return Vite.isRunningHot(viteOptions);
}

/**
 * Get the hot URL from the hot file
 * @deprecated Use Vite.hotUrl() instead
 */
export function getHotUrl(viteOptions?: Partial<ViteOptions>): string | null {
    return Vite.hotUrl(viteOptions);
}

/**
 * Load the Vite manifest file
 * @deprecated Use Vite.manifest() instead
 */
export function loadViteManifest(viteOptions?: Partial<ViteOptions>): Record<string, any> | null {
    return Vite.manifest(viteOptions);
}

/**
 * Generate Vite asset tags for development or production
 * @param entrypoints - Array of entrypoint paths (e.g., ['src/app.tsx'])
 * @param viteOptions - Optional Vite configuration
 * @returns HTML string with script and link tags
 */
export function viteAssets(entrypoints: string | string[], viteOptions?: Partial<ViteOptions>): string {
    return Vite.makeTag(entrypoints, viteOptions);
}

/**
 * Legacy renderHtmlTemplate function for backwards compatibility
 */
export function renderHtmlTemplate(page: Page, options: HtmlTemplateOptions = {}, viteOptions?: Partial<ViteOptions> | null): string {
    const {
        title = 'Inertia',
        dev = false,
        hotUrl = null,
        head = '',
        body = ''
    } = options

    const pageData = JSON.stringify(page)
        .replaceAll(/</g, '\\u003c')
        .replaceAll(/"/g, '&quot;')

    // Generate asset tags using the Vite class
    const assetTags = Vite.makeTag(viteOptions?.entrypoints || ['client/App.tsx'], viteOptions || undefined);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

    ${assetTags}

    ${head}
</head>
<body class="font-sans antialiased">
    <div id="app" data-page='${pageData}'></div>
    ${body}
</body>
</html>`
}

export function renderInertiaHead(page: Page): string {
    // This would typically render meta tags, title, etc.
    return `<meta name="inertia-page" content="${JSON.stringify(page).replace(/"/g, '&quot;')}">`
}

export function renderInertiaBody(page: Page): string {
    // This would typically render the app container
    return `<div id="app" data-page="${JSON.stringify(page).replaceAll(/</g, '\\u003c').replaceAll(/"/g, '&quot;')}"></div>`
}
