import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import uploadRoutes from "./controller/upload.js"

const app = new Hono()

// Enable CORS for frontend
app.use(cors());

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
