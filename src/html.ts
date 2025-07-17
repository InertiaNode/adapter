import type { Page } from './types.js'

export interface HtmlTemplateOptions {
  title?: string
  dev?: boolean
  hotUrl?: string
  head?: string
  body?: string
}

export function renderHtmlTemplate(page: Page, options: HtmlTemplateOptions = {}): string {
  const {
    title = 'Inertia',
    dev = false,
    hotUrl = 'http://localhost:5173',
    head = '',
    body = ''
  } = options

  const pageData = JSON.stringify(page).replace(/</g, '\\u003c')

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

    ${dev ? `
    <!-- Development mode scripts -->
    <script type="module">
        import RefreshRuntime from '${hotUrl}/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="${hotUrl}/@vite/client"></script>
    <script type="module" src="${hotUrl}/src/client/app.tsx"></script>
    ` : ''}

    ${head}
</head>
<body class="font-sans antialiased">
    <div id="app" data-page="${pageData}"></div>
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
  return `<div id="app" data-page="${JSON.stringify(page).replace(/</g, '\\u003c')}"></div>`
}