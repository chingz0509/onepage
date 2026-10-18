import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import apiFetch from './api/fetch'
import apiWebBridge, { resolveWebBridgeUrl } from './api/webbridge'
import apiPages from './api/pages'
import apiScreenshot from './api/screenshot'

/** 开发环境把 serverless handler 挂进 dev server，/api/fetch 与线上行为一致 */
function devApi(): Plugin {
  const mount = (middlewares: {
    use: (path: string, fn: (req: never, res: never) => void) => void
  }) => {
    middlewares.use('/api/fetch', (req, res) => {
      void apiFetch(req, res)
    })
    middlewares.use('/api/screenshot', (req, res) => {
      void apiScreenshot(req, res)
    })
    middlewares.use('/api/pages', (req, res) => {
      const request = req as unknown as { method?: string; url?: string; headers?: Record<string, string | string[] | undefined>; on: (event: string, handler: (chunk?: Buffer) => void) => void }
      if (request.method === 'GET') { void apiPages(request, res); return }
      let body = ''
      request.on('data', (chunk) => { if (body.length <= 220000) body += chunk?.toString() ?? '' })
      request.on('end', () => {
        let parsed: unknown = null
        try { parsed = JSON.parse(body) } catch { /* handler returns invalid-page */ }
        void apiPages({ method: request.method, url: request.url, headers: request.headers, body: parsed }, res)
      })
    })
    middlewares.use('/api/webbridge', (req, res) => {
      let body = ''
      const request = req as unknown as { method?: string; on: (event: string, handler: (chunk?: Buffer) => void) => void }
      request.on('data', (chunk) => { body += chunk?.toString() ?? '' })
      request.on('end', () => {
        let parsed: unknown = {}
        try { parsed = body ? JSON.parse(body) : {} } catch { parsed = null }
        void apiWebBridge({ method: request.method, body: parsed }, res)
      })
    })
  }
  return {
    name: 'dev-api-fetch',
    configureServer: (server) => mount(server.middlewares as never),
    configurePreviewServer: (server) => mount(server.middlewares as never),
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['WEBBRIDGE_URL', 'CHROME_EXECUTABLE_PATH', 'BROWSER_WS_ENDPOINT', 'SCRAPER_PROVIDER', 'SCRAPER_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (process.env[key] === undefined && env[key]) process.env[key] = env[key]
  }
  return {
    plugins: [react(), devApi()],
    base: './',
    server: {
      proxy: {
        // WebBridge 通过同源代理连接服务器浏览器。
        // 桥服务对带 Origin 头的请求会返回空响应，代理时剥掉 Origin。
        '/bridge': {
          target: new URL(resolveWebBridgeUrl()).origin,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/bridge/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (req) => {
              req.removeHeader('origin')
            })
          },
        },
      },
    },
  }
})
