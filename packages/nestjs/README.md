# @inertianode/nestjs

The official NestJS adapter for [Inertia.js](https://inertiajs.com/). This package allows you to use Inertia.js with NestJS, enabling you to build modern single-page applications using server-side routing and controllers.

## Installation

```bash
npm install @inertianode/nestjs
# or
pnpm add @inertianode/nestjs
# or
yarn add @inertianode/nestjs
```

## Usage

### Basic Setup

There are three ways to use the Inertia adapter in NestJS:

#### 1. Using Middleware Class (Recommended for DI)

```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { InertiaNestJSMiddleware } from '@inertianode/nestjs';

@Module({
  // ... your modules
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(InertiaNestJSMiddleware)
      .forRoutes('*');
  }
}
```

#### 2. Using Factory Function

```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { createInertiaMiddleware } from '@inertianode/nestjs';

@Module({
  // ... your modules
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(createInertiaMiddleware({
        version: '1.0.0',
        // other options...
      }))
      .forRoutes('*');
  }
}
```

#### 3. Using Functional Middleware

```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { inertiaNestJSAdapter } from '@inertianode/nestjs';

@Module({
  // ... your modules
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(inertiaNestJSAdapter({
        version: '1.0.0',
      }))
      .forRoutes('*');
  }
}
```

### Using in Controllers

#### With Decorator (Recommended)

```typescript
// users.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InertiaDecorator, type InertiaInstance } from '@inertianode/nestjs';

@Controller('users')
export class UsersController {
  @Get()
  async index(@InertiaDecorator() inertia: InertiaInstance) {
    const users = await this.usersService.findAll();
    await inertia.render('Users/Index', { users });
  }

  @Get(':id')
  async show(
    @Param('id') id: string,
    @InertiaDecorator() inertia: InertiaInstance
  ) {
    const user = await this.usersService.findOne(id);
    await inertia.render('Users/Show', { user });
  }
}
```

#### Without Decorator

```typescript
// users.controller.ts
import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

@Controller('users')
export class UsersController {
  @Get()
  async index(@Req() req: Request, @Res() res: Response) {
    const users = await this.usersService.findAll();
    await req.Inertia.render('Users/Index', { users });
  }
}
```

## API Reference

### Middleware Options

```typescript
interface InertiaMiddlewareOptions {
  version?: string | (() => string);
  flashMessages?: () => Record<string, any>;
  html?: (page: Page, viewData: any) => string | Promise<string>;
  vite?: Partial<ViteOptions>;
  ssr?: SsrOptions;
}
```

### Inertia Instance Methods

The `InertiaInstance` type provides the following methods:

#### `render(component: string, props?: Record<string, any>): Promise<void>`

Render an Inertia component with props.

```typescript
await inertia.render('Users/Index', { users: [] });
```

#### `share(key: string | Record<string, any>, value?: any): void`

Share data with all Inertia requests (scoped to the current request).

```typescript
// Share a single value
inertia.share('auth', { user: currentUser });

// Share multiple values
inertia.share({
  auth: { user: currentUser },
  flash: { message: 'Success!' }
});
```

#### `setVersion(version: string | (() => string)): void`

Set the asset version for cache busting.

```typescript
inertia.setVersion('1.0.0');
// or
inertia.setVersion(() => Date.now().toString());
```

#### `getVersion(): string | undefined`

Get the current asset version.

```typescript
const version = inertia.getVersion();
```

#### `location(url: string): void`

Create a client-side redirect.

```typescript
inertia.location('/login');
```

#### `back(fallbackUrl?: string): void`

Redirect back to the previous page.

```typescript
inertia.back();
// or with fallback
inertia.back('/dashboard');
```

#### `clearHistory(): void`

Clear the history state.

```typescript
inertia.clearHistory();
```

#### `encryptHistory(encrypt?: boolean): void`

Enable or disable history encryption.

```typescript
inertia.encryptHistory(true);
```

## Advanced Usage

### Sharing Data Globally

You can share data across all requests using middleware:

```typescript
@Injectable()
export class ShareDataMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = await this.authService.getCurrentUser(req);

    req.Inertia.share({
      auth: { user },
      flash: {
        success: req.session?.flash?.success,
        error: req.session?.flash?.error,
      }
    });

    next();
  }
}
```

### Custom HTML Template

```typescript
// app.module.ts
createInertiaMiddleware({
  html: async (page, viewData) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${page.props.title || 'My App'}</title>
          <link rel="stylesheet" href="/app.css">
        </head>
        <body>
          <div id="app" data-page='${JSON.stringify(page)}'></div>
          <script src="/app.js"></script>
        </body>
      </html>
    `;
  }
})
```

### Asset Versioning

```typescript
createInertiaMiddleware({
  version: () => {
    // Read from a version file or generate dynamically
    return fs.readFileSync('public/mix-manifest.json', 'utf-8');
  }
})
```

### Server-Side Rendering (SSR)

```typescript
createInertiaMiddleware({
  ssr: {
    enabled: true,
    url: 'http://localhost:13714', // Your SSR server URL
  }
})
```

## Type Safety

The package includes full TypeScript support. Import types as needed:

```typescript
import type {
  InertiaInstance,
  InertiaMiddlewareOptions,
} from '@inertianode/nestjs';
```

## Examples

### Creating a Dashboard

```typescript
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async index(@InertiaDecorator() inertia: InertiaInstance) {
    const stats = await this.statsService.getStats();

    inertia.share({
      auth: { user: await this.getCurrentUser() }
    });

    await inertia.render('Dashboard/Index', {
      stats,
      recentActivity: await this.statsService.getRecentActivity()
    });
  }
}
```

### Form Submissions with Validation

```typescript
@Controller('users')
export class UsersController {
  @Post()
  async store(
    @Body() createUserDto: CreateUserDto,
    @InertiaDecorator() inertia: InertiaInstance
  ) {
    try {
      const user = await this.usersService.create(createUserDto);
      inertia.back('/users');
    } catch (error) {
      if (error instanceof ValidationError) {
        inertia.share('errors', error.getErrors());
        inertia.back();
      }
      throw error;
    }
  }
}
```

### File Downloads

```typescript
@Controller('reports')
export class ReportsController {
  @Get('export')
  async export(@Res() res: Response) {
    const csv = await this.reportsService.generateCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
    res.send(csv);
  }
}
```

## Testing

The package includes comprehensive test coverage. Run tests with:

```bash
pnpm test
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

MIT

## Links

- [Inertia.js Documentation](https://inertiajs.com/)
- [NestJS Documentation](https://nestjs.com/)
- [GitHub Repository](https://github.com/InertiaNode/adapter)
