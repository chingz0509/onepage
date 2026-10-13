import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { renderPage } from '../server/browser.js'
import { validateTarget } from '../server/network.js'

export const maxDuration = 60
type Req = { method?: string; url?: string; query?: Record<string, string | string[]> }
type Res = { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }
type Preview = { ok: true; previewImage: string; title: string } | { ok: false; reason: string }

async function storePreview(bytes: Buffer): Promise<string> {
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  // Reuse the existing public JPEG bucket; previews are separate from avatar paths.
  const path = `previews/${createHash('sha256').update(bytes).digest('hex')}.jpg`
  const bucket = db.storage.from('onepage-avatars')
  const { error } = await bucket.upload(path, bytes, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' })
  if (error) throw new Error('preview-save-failed')
  return bucket.getPublicUrl(path).data.publicUrl
}

export function createScreenshotHandler(deps = { renderPage, storePreview }) {
  const cache = new Map<string, { expires: number; preview: Preview }>()
  const pending = new Map<string, Promise<Preview>>()
  return async (req: Req, res: Res): Promise<void> => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    const reply = (status: number, body: Preview) => { res.statusCode = status; res.end(JSON.stringify(body)) }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return reply(405, { ok: false, reason: 'method-not-allowed' })
    }
    const raw = req.query?.url ?? new URL(req.url ?? '', 'http://localhost').searchParams.get('url')
    const target = typeof raw === 'string' && raw.length <= 2048 ? validateTarget(raw) : null
    if (!target) return reply(400, { ok: false, reason: 'blocked-target' })
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return reply(503, { ok: false, reason: 'storage-not-configured' })
    const url = target.href
    const cached = cache.get(url)
    if (cached && cached.expires > Date.now()) return reply(200, cached.preview)
    let task = pending.get(url)
    if (!task) {
      task = (async (): Promise<Preview> => {
        const result = await deps.renderPage(url, { screenshot: true })
        if ('reason' in result) return { ok: false, reason: result.reason }
        if (!result.screenshot) return { ok: false, reason: 'preview-unavailable' }
        const previewImage = await deps.storePreview(result.screenshot)
        const preview: Preview = { ok: true, previewImage, title: result.title ?? '' }
        if (cache.size >= 32) cache.delete(cache.keys().next().value!)
        cache.set(url, { expires: Date.now() + 6 * 60 * 60 * 1000, preview })
        return preview
      })().catch((): Preview => ({ ok: false, reason: 'preview-unavailable' })).finally(() => { pending.delete(url) })
      pending.set(url, task)
    }
    return reply(200, await task)
  }
}

export default createScreenshotHandler()
