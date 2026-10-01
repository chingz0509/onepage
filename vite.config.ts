import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import apiFetch from './api/fetch'

/** 开发环境把 serverless handler 挂进 dev server，/api/fetch 与线上行为一致 */
function devApi(): Plugin {
  const mount = (middlewares: {
    use: (path: string, fn: (req: never, res: never) => void) => void
  }) => {
    middlewares.use('/api/fetch', (req, res) => {
      void apiFetch(req, res)
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
  for (const key of ['CHROME_EXECUTABLE_PATH', 'BROWSER_WS_ENDPOINT', 'SCRAPER_PROVIDER', 'SCRAPER_API_KEY']) {
    if (process.env[key] === undefined && env[key]) process.env[key] = env[key]
  }
  return {
    plugins: [react(), devApi()],
    base: './',
    server: {
      proxy: {
        // 演示机上把 WebBridge 代理进同源，页面免 CORS 直接调用本机浏览器抓取。
        // 桥服务对带 Origin 头的请求会返回空响应，代理时剥掉 Origin。
        '/bridge': {
          target: 'http://127.0.0.1:10086',
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
