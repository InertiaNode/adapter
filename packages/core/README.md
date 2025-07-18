# @inertianode/core

Core package for InertiaNode providing the foundation for all adapters.

## Features

- **InertiaResponse**: Core response handling for Inertia.js
- **VersionDetector**: Automatic asset version detection with development mode support
- **Prop Helpers**: Lazy, deferred, and merge props
- **HTML Renderer**: Server-side HTML template generation
- **Headers**: Inertia.js header constants

## Version Detection

The `VersionDetector` class provides automatic asset version detection, inspired by the Laravel Inertia implementation. It properly handles both development and production modes.

### Automatic Detection

```typescript
import { VersionDetector } from "@inertianode/core";

// Automatically detect version from manifest files or hot file
const version = VersionDetector.detectVersion();
console.log("Detected version:", version);
```

### Supported Manifest Files

The detector automatically checks for these files in order:

1. `public/build/manifest.json` (Vite)
2. `public/mix-manifest.json` (Laravel Mix)
3. `public/manifest.json` (Custom)

### Custom Configuration

```typescript
// Use custom Vite options
const version = VersionDetector.detectVersion("public", {
  hotFile: "hot",
  buildDirectory: "build",
  manifestFilename: "manifest.json",
});

// Check if in development mode
const isDev = VersionDetector.isDevelopmentMode("public", "hot");
```

### Create Version Detector Function

```typescript
// Create a function for use with Inertia.setVersion()
const versionDetector = VersionDetector.createVersionDetector("public", {
  hotFile: "hot",
  buildDirectory: "build",
  manifestFilename: "manifest.json",
});
Inertia.setVersion(versionDetector);
```

### How It Works

The version detector:

1. **Development Mode**:
   - Checks for the hot file (e.g., `public/hot`)
   - Uses the hot file content as version
   - Ensures version changes when dev server restarts

2. **Production Mode**:
   - Reads the manifest file content
   - Creates an MD5 hash of the content
   - Returns the hash as the version string
   - Returns `null` if no manifest file is found

This ensures that when your assets change, the version changes automatically, triggering a full page reload in Inertia.js.

## Usage in Adapters

All InertiaNode adapters automatically use version detection when no explicit version is provided:

```typescript
// Automatic version detection (default)
app.use(inertiaExpressAdapter());

// Custom version (overrides automatic detection)
app.use(
  inertiaExpressAdapter({
    version: "my-custom-version",
  })
);

// Custom Vite options with automatic version detection
app.use(
  inertiaExpressAdapter({
    vite: {
      publicDirectory: "dist",
      buildDirectory: "assets",
      hotFile: "hot",
    },
  })
);
```

## API Reference

### `VersionDetector.detectVersion(publicDirectory?: string, viteOptions?: object): string | null`

Detects the current asset version from manifest files or hot file.

- `publicDirectory` (optional): Custom public directory path (default: 'public')
- `viteOptions` (optional): Vite configuration options
  - `hotFile`: Hot file name (default: 'hot')
  - `buildDirectory`: Build directory name (default: 'build')
  - `manifestFilename`: Manifest filename (default: 'manifest.json')
- Returns: Version string or null if no manifest/hot file found

### `VersionDetector.createVersionDetector(publicDirectory?: string, viteOptions?: object): () => string`

Creates a version detector function for use with `Inertia.setVersion()`.

- `publicDirectory` (optional): Custom public directory path (default: 'public')
- `viteOptions` (optional): Vite configuration options
- Returns: Function that returns the current version string

### `VersionDetector.isDevelopmentMode(publicDirectory?: string, hotFile?: string): boolean`

Checks if the application is currently in development mode.

- `publicDirectory` (optional): Custom public directory path (default: 'public')
- `hotFile` (optional): Hot file name (default: 'hot')
- Returns: Boolean indicating if in development mode
