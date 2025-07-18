# @inertianode/express

Express adapter for InertiaNode with a clean, intuitive API and automatic version detection.

## Installation

```bash
npm install @inertianode/express
```

## Usage

### Basic Setup

```typescript
import express from "express";
import { inertiaExpressAdapter, InertiaExpress } from "@inertianode/express";

const app = express();

// Add the Inertia middleware with automatic version detection
app.use(inertiaExpressAdapter());

// Your routes
app.get("/", async (req, res) => {
  await InertiaExpress.renderForExpress(
    "Index",
    {
      title: "Welcome to Inertia Express",
    },
    req
  ).toExpressResponse(res);
});
```

### Automatic Version Detection

The Express adapter now includes automatic version detection that works out of the box:

- **Development Mode**: Automatically detects version from the Vite hot file (`public/hot`)
- **Production Mode**: Automatically detects version from manifest files:
  - **Vite**: `public/build/manifest.json`
  - **Laravel Mix**: `public/mix-manifest.json`
  - **Custom**: `public/manifest.json`

No configuration needed! The version is automatically calculated based on your current mode and asset files.

### Custom Version Detection

If you need custom version detection, you can still provide your own:

```typescript
app.use(
  inertiaExpressAdapter({
    version: () => "my-custom-version",
    // or
    version: "static-version-string",
  })
);
```

### Clean API

The new `InertiaExpress` API provides a much cleaner way to handle Inertia responses:

```typescript
// ❌ Old way (verbose and error-prone)
app.get("/users", async (req, res) => {
  const webRequest = expressRequestToWebRequest(req);
  const response = await Inertia.render("Users", { users: [] }).toResponse(
    webRequest
  );

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  res.status(response.status).send(response.body);
});

// ✅ New way (clean and simple)
app.get("/users", async (req, res) => {
  await InertiaExpress.renderForExpress(
    "Users",
    {
      users: [],
    },
    req
  ).toExpressResponse(res);
});
```

### Advanced Usage

You can also access the underlying InertiaResponse for advanced usage:

```typescript
app.get("/complex", async (req, res) => {
  const expressResponse = InertiaExpress.renderForExpress(
    "Complex",
    {
      data: "some data",
    },
    req
  );

  // Access the underlying InertiaResponse
  const inertiaResponse = expressResponse.getInertiaResponse();

  // Do something with it...
  const webRequest = expressRequestToWebRequest(req);
  const webResponse = await inertiaResponse.toResponse(webRequest);

  // Custom handling
  res.status(webResponse.status).send(webResponse.body);
});
```

## API Reference

### `InertiaExpress.renderForExpress(component, props, req)`

Renders an Inertia component and returns an Express-specific response handler.

- `component` (string): The component name to render
- `props` (object): Props to pass to the component
- `req` (ExpressRequest): The Express request object

Returns: `ExpressInertiaResponse`

### `ExpressInertiaResponse.toExpressResponse(res)`

Sends the Inertia response to an Express response object.

- `res` (ExpressResponse): The Express response object

### `ExpressInertiaResponse.getInertiaResponse()`

Returns the underlying `InertiaResponse` for advanced usage.

## Benefits

1. **Cleaner Code**: No more manual request/response conversion
2. **Type Safety**: Full TypeScript support with proper types
3. **Error Handling**: Automatic header conversion and error handling
4. **Consistency**: Same API across all Express routes
5. **Flexibility**: Access to underlying InertiaResponse when needed
