import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
})
