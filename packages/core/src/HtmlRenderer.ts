import type { HtmlTemplateOptions, Page, ViteOptions } from './types.js'
import fs from 'fs';
import path from 'path';

export function renderHtmlTemplate(page: Page, options: HtmlTemplateOptions = {}, viteOptions?: ViteOptions | null): string {
    const {
        title = 'Inertia',
        dev = false,
        hotUrl = 'http://localhost:5173',
        head = '',
        body = ''
    } = options

    const pageData = JSON.stringify(page)
        .replaceAll(/</g, '\\u03c')
        .replaceAll(/"/g, '&quot;')

    // Use ViteOptions if provided, otherwise use defaults
    const defaultViteOptions: ViteOptions = {
        hotFile: 'hot',
        buildDirectory: 'build',
        manifestFilename: 'manifest.json',
        publicDirectory: 'public'
    }

    const finalViteOptions = viteOptions || defaultViteOptions

    // Check if we're in development mode (hot file exists)
    const hotFilePath = path.join(process.cwd(), finalViteOptions.publicDirectory, finalViteOptions.hotFile)
    const isDevelopment = fs.existsSync(hotFilePath)

    // Load manifest for production assets
    const manifestPath = path.join(process.cwd(), finalViteOptions.publicDirectory, finalViteOptions.manifestFilename)
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null

    // Generate asset tags
    const assetTags = generateAssetTags(isDevelopment, hotUrl, manifest, finalViteOptions)

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

function generateAssetTags(isDevelopment: boolean, hotUrl: string, manifest: any, viteOptions: ViteOptions): string {
    if (isDevelopment) {
        // Development mode - use Vite dev server
        return `
    <!-- Development mode scripts -->
    <script type="module">
        import RefreshRuntime from '${hotUrl}/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="${hotUrl}/@vite/client"></script>
    <script type="module" src="${hotUrl}/client/App.tsx"></script>
        `
    } else {
        // Production mode - load from manifest
        if (!manifest) {
            console.warn('No manifest file found for production assets')
            return ''
        }

        const assetTags: string[] = []

        // Add CSS files
        for (const [entry, asset] of Object.entries(manifest)) {
            if (typeof asset === 'object' && asset !== null && 'css' in asset) {
                const cssFiles = Array.isArray(asset.css) ? asset.css : [asset.css]
                for (const cssFile of cssFiles) {
                    if (cssFile) {
                        assetTags.push(`<link rel="stylesheet" href="/${viteOptions.buildDirectory}/${cssFile}">`)
                    }
                }
            }
        }

        // Add JS files
        for (const [entry, asset] of Object.entries(manifest)) {
            if (typeof asset === 'object' && asset !== null && 'file' in asset) {
                assetTags.push(`<script type="module" src="/${viteOptions.buildDirectory}/${asset.file}"></script>`)
            }
        }

        return assetTags.join('\n    ')
    }
}

export function renderInertiaHead(page: Page): string {
    // This would typically render meta tags, title, etc.
    return `<meta name="inertia-page" content="${JSON.stringify(page).replace(/"/g, '&quot;')}">`
}

export function renderInertiaBody(page: Page): string {
    // This would typically render the app container
    return `<div id="app" data-page="${JSON.stringify(page).replaceAll(/</g, '\\u003c').replaceAll(/"/g, '&quot;')}"></div>`
}
