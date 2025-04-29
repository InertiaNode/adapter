import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import fs from 'fs/promises'
import mime from 'mime-types'
import { serveStatic } from "hono/serve-static";

const app = new Hono()

// Serve static files
app.use('/*', serveStatic({
  root: './public',
  getContent: async (path, c) => {
    try {
      const data = await fs.readFile(path);
      let contentType = mime.contentType(path) ?? "text/plain";

      return new Response(data, {
        headers: {
          "Content-Type": contentType.toString(),
        },
      });
    } catch (error) {
      return null;
    }
  },
}))

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
