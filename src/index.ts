import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import uploadRoutes from "./controller/upload.js"

const app = new Hono()

app.route('/', uploadRoutes)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

serve({
  fetch: app.fetch,
  port: 3001
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
