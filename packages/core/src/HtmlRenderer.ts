import type { HtmlTemplateOptions, Page, ViteOptions } from './types.js'
import fs from 'fs';
import path from 'path';

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

    // Use ViteOptions if provided, otherwise use defaults
    const defaultViteOptions: ViteOptions = {
        hotFile: 'hot',
        buildDirectory: 'build',
        manifestFilename: 'manifest.json',
        publicDirectory: 'public',
        entrypoints: ['client/App.tsx']
    }

    const finalViteOptions = {
        ...defaultViteOptions,
        ...(viteOptions || {}),
    };

    // Check if we're in development mode (hot file exists)
    const hotFilePath = path.join(process.cwd(), finalViteOptions.publicDirectory, finalViteOptions.hotFile)
    const isDevelopment = fs.existsSync(hotFilePath)
    const hotFile = isDevelopment ? fs.readFileSync(hotFilePath, 'utf8').trim() : null;

    // Load manifest for production assets
    const manifestPath = path.join(process.cwd(), finalViteOptions.publicDirectory, finalViteOptions.buildDirectory, finalViteOptions.manifestFilename)
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null

    // Detect if React is being used
    const isReactApp = detectReactUsage(finalViteOptions, manifest)

    const computedHotUrl = hotUrl ?? hotFile ?? 'http://localhost:5173';

    // Generate asset tags
    const assetTags = generateAssetTags(isDevelopment, computedHotUrl, manifest, finalViteOptions, isReactApp)

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

function detectReactUsage(viteOptions: ViteOptions, manifest: any): boolean {
    // Check if any entrypoints suggest React usage
    const entrypoints = viteOptions.entrypoints || ['client/App.tsx']

    // Check for React-like file extensions or names
    const hasReactEntrypoint = entrypoints.some(entry =>
        entry.includes('.tsx') ||
        entry.includes('.jsx')
    )

    if (hasReactEntrypoint) {
        return true
    }

    // In production, check manifest for React-related files
    if (manifest) {
        for (const [entry, asset] of Object.entries(manifest)) {
            if (typeof asset === 'object' && asset !== null && 'file' in asset) {
                const fileName = asset.file as string
                if (fileName.includes('react') || fileName.includes('jsx') || fileName.includes('tsx')) {
                    return true
                }
            }
        }
    }

    // Check if React is in package.json dependencies
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json')
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
            const allDeps = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies,
                ...packageJson.peerDependencies
            }

            return !!(allDeps.react || allDeps['@types/react'] || allDeps['react-dom'])
        }
    } catch (error) {
        // Ignore errors reading package.json
    }

    return false
}

function generateAssetTags(isDevelopment: boolean, hotUrl: string, manifest: any, viteOptions: ViteOptions, isReactApp: boolean): string {
    if (isDevelopment) {
        // Development mode - use Vite dev server
        const entrypoints = viteOptions.entrypoints || ['client/App.tsx']

        let devScripts = `
    <!-- Development mode scripts -->
    <script type="module" src="${hotUrl}/@vite/client"></script>`

        // Add React refresh only if React is detected
        if (isReactApp) {
            devScripts += `
    <script type="module">
        import RefreshRuntime from '${hotUrl}/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
    </script>`
        }

        // Add entrypoint scripts
        for (const entrypoint of entrypoints) {
            devScripts += `
    <script type="module" src="${hotUrl}/${entrypoint}"></script>`
        }

        return devScripts
    } else {
        // Production mode - load from manifest
        if (!manifest) {
            console.warn('No manifest file found for production assets')
            return ''
        }

        const assetTags: string[] = []
        const entrypoints = viteOptions.entrypoints || ['client/App.tsx']

        // If specific entrypoints are defined, load only those
        if (entrypoints.length > 0) {
            for (const entrypoint of entrypoints) {
                const asset = manifest[entrypoint]
                if (asset && typeof asset === 'object') {
                    // Add CSS files for this entrypoint
                    if ('css' in asset) {
                        const cssFiles = Array.isArray(asset.css) ? asset.css : [asset.css]
                        for (const cssFile of cssFiles) {
                            if (cssFile) {
                                assetTags.push(`<link rel="stylesheet" href="/${viteOptions.buildDirectory}/${cssFile}">`)
                            }
                        }
                    }

                    // Add JS file for this entrypoint
                    if ('file' in asset) {
                        assetTags.push(`<script type="module" src="/${viteOptions.buildDirectory}/${asset.file}"></script>`)
                    }

                    // Add any imports for this entrypoint
                    if ('imports' in asset && Array.isArray(asset.imports)) {
                        for (const importFile of asset.imports) {
                            const importAsset = manifest[importFile]
                            if (importAsset && typeof importAsset === 'object' && 'file' in importAsset) {
                                assetTags.push(`<link rel="modulepreload" href="/${viteOptions.buildDirectory}/${importAsset.file}">`)
                            }
                        }
                    }
                }
            }
        } else {
            // Fallback: load all assets from manifest (legacy behavior)
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
