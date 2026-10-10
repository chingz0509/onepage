import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { validPageData } from '../server/pageData.js'

export const maxDuration = 30
type Req = { method?: string; url?: string; query?: Record<string, string | string[]>; body?: unknown; headers?: Record<string, string | string[] | undefined> }
type Res = { statusCode: number; setHeader: (key: string, value: string) => void; end: (body: string) => void }
const hash = (token: string) => createHash('sha256').update(token).digest('hex')

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  const reply = (status: number, body: unknown) => { res.statusCode = status; res.end(JSON.stringify(body)) }
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return reply(503, { error: 'storage-not-configured' })
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  try {
    if (req.method === 'GET') {
      const slug = req.query?.slug ?? new URL(req.url ?? '', 'http://localhost').searchParams.get('slug')
      if (typeof slug !== 'string' || !/^[A-Za-z0-9_-]{12}$/.test(slug)) return reply(400, { error: 'invalid-slug' })
      const { data, error } = await db.from('onepage_pages').select('data,updated_at').eq('slug', slug).maybeSingle()
      if (error) return reply(503, { error: 'storage-unavailable' })
      return data ? reply(200, { data: data.data, updatedAt: data.updated_at }) : reply(404, { error: 'not-found' })
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return reply(405, { error: 'method-not-allowed' })
    }
    // JSON is accepted only; cross-origin HTML forms cannot publish pages.
    if (!String(req.headers?.['content-type'] ?? '').startsWith('application/json')) return reply(415, { error: 'json-required' })
    const body = req.body as { data?: unknown; slug?: unknown; editToken?: unknown } | null
    if (!body || JSON.stringify(body).length > 220000 || !validPageData(body.data)) return reply(400, { error: 'invalid-page' })
    const existingSlug = body.slug
    const editing = existingSlug !== undefined
    if (editing && (typeof existingSlug !== 'string' || !/^[A-Za-z0-9_-]{12}$/.test(existingSlug) ||
      typeof body.editToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.editToken))) return reply(403, { error: 'edit-not-allowed' })
    const slug = editing ? existingSlug as string : randomBytes(9).toString('base64url')
    const token = editing ? body.editToken as string : randomBytes(32).toString('base64url')
    const tokenHash = hash(token)
    if (editing) {
      const { data, error } = await db.from('onepage_pages').select('edit_token_hash').eq('slug', slug).maybeSingle()
      if (error) return reply(503, { error: 'storage-unavailable' })
      if (!data || !timingSafeEqual(Buffer.from(tokenHash), Buffer.from(data.edit_token_hash))) return reply(403, { error: 'edit-not-allowed' })
    }
    const page = { ...body.data, slug }
    if (page.avatarImage?.startsWith('data:image/jpeg;base64,')) {
      const bytes = Buffer.from(page.avatarImage.split(',')[1], 'base64')
      if (bytes.length > 131072 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return reply(400, { error: 'invalid-avatar' })
      // Content-addressed paths keep existing public images intact if saving fails.
      const path = `${slug}/${createHash('sha256').update(bytes).digest('hex').slice(0, 24)}.jpg`
      const { error } = await db.storage.from('onepage-avatars').upload(path, bytes, { contentType: 'image/jpeg', upsert: true })
      if (error) return reply(503, { error: 'avatar-save-failed' })
      page.avatarImage = db.storage.from('onepage-avatars').getPublicUrl(path).data.publicUrl
    }
    const now = new Date().toISOString()
    if (editing) {
      const { data, error } = await db.from('onepage_pages').update({ data: page, updated_at: now })
        .eq('slug', slug).eq('edit_token_hash', tokenHash).select('slug').maybeSingle()
      if (error) return reply(503, { error: 'storage-unavailable' })
      if (!data) return reply(403, { error: 'edit-not-allowed' })
    } else {
      const { error } = await db.from('onepage_pages').insert({ slug, edit_token_hash: tokenHash, data: page })
      if (error) return reply(503, { error: 'storage-unavailable' })
    }
    return reply(200, { slug, editToken: token, data: page })
  } catch {
    return reply(503, { error: 'storage-unavailable' })
  }
}
