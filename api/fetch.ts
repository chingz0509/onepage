/**
 * Vercel Serverless Function：GET /api/fetch?url=<目标链接>
 * 始终返回 HTTP 200，前端靠 ok 字段判断成败。
 * 也被 vite.config.ts 的 dev 中间件直接复用（Node req/res 风格）。
 */

import { fetchAndExtract } from './_extract.js'

type Req = { url?: string; query?: Record<string, string | string[]> }
type Res = {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body: string) => void
}

export default async function handler(req: Req, res: Res): Promise<void> {
  const url =
    typeof req.query?.url === 'string'
      ? req.query.url
      : new URL(req.url ?? '', 'http://localhost').searchParams.get('url')
  const result = await fetchAndExtract(url)
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600')
  res.end(JSON.stringify(result))
}
