# InertiaNode Adapter - Subpackage Structure

This package has been restructured to support individual framework adapters without cross-dependencies.

## Package Structure

```
adapter/
├── packages/
│   ├── core/           # Shared logic and types
│   ├── hono/           # Hono-specific adapter
│   └── express/        # Express-specific adapter
└── src/                # Main package re-exports
```

## Installation Options

### Option 1: Install everything (legacy)

```bash
npm install inertianode/adapter
```

### Option 2: Install only what you need

#### For Hono projects:

```bash
npm install @inertianode/hono
```

#### For Express projects:

```bash
npm install @inertianode/express
```

#### For custom adapters:

```bash
npm install @inertianode/core
```

## Usage

### Hono Usage

```typescript
import { inertiaHonoAdapter, Inertia } from "@inertianode/hono";
import { Hono } from "hono";

const app = new Hono();

app.use(
  inertiaHonoAdapter({
    version: "1.0.0",
  })
);

app.get("/", (c) => {
  return Inertia.render("Home", {
    title: "Welcome",
  }).toResponse(c.req.raw);
});
```

### Express Usage

```typescript
import { inertiaExpressAdapter, Inertia } from "@inertianode/express";
import express from "express";

const app = express();

app.use(
  inertiaExpressAdapter({
    version: "1.0.0",
  })
);

app.get("/", (req, res) => {
  return Inertia.render("Home", {
    title: "Welcome",
  }).toResponse(req, res);
});
```

### Core Only (for custom adapters)

```typescript
import { Inertia, Headers, type Page } from "@inertianode/core";

// Use core functionality to build custom adapters
```

## Benefits

1. **Smaller bundle sizes** - Only install what you need
2. **No cross-dependencies** - Hono package doesn't depend on Express
3. **Framework isolation** - Each adapter is independent
4. **Shared logic** - Core functionality is reused
5. **Type safety** - Full TypeScript support for each package

## Development

To build all packages:

```bash
npm run build
```

To build individual packages:

```bash
npm run build:core
npm run build:hono
npm run build:express
```
