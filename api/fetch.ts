/**
 * Vercel Serverless Function：GET /api/fetch?url=<目标链接>
 * 抓取结果返回 HTTP 200，前端靠 ok 字段判断成败；方法与模式错误返回 4xx。
 * 也被 vite.config.ts 的 dev 中间件直接复用（Node req/res 风格）。
 */

import { fetchAndExtract } from '../server/extract.js'

/** 二级回退走商业抓取服务（JS 渲染较慢），放宽函数超时 */
export const maxDuration = 90

type Req = { method?: string; url?: string; query?: Record<string, string | string[]> }
type Res = {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body: string) => void
}

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method && req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET')
    res.end(JSON.stringify({ ok: false, reason: 'method-not-allowed' }))
    return
  }
  const params = new URL(req.url ?? '', 'http://localhost').searchParams
  const url =
    typeof req.query?.url === 'string'
      ? req.query.url
      : params.get('url')
  const mode = req.query?.mode ?? params.get('mode') ?? 'auto'
  if (mode !== 'auto' && mode !== 'browser') {
    res.statusCode = 400
    res.end(JSON.stringify({ ok: false, reason: 'invalid-mode' }))
    return
  }
  const result = await fetchAndExtract(url, mode).catch(() => ({ ok: false, reason: 'fetch-failed' }))
  res.statusCode = 200
  res.end(JSON.stringify(result))
}
