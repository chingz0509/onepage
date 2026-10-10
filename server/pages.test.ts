import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import handler from '../api/pages.js'
import { validPageData } from './pageData.js'

const page = {
  kind: 'onepage', slug: '', name: '测试名片', title: '设计师', bio: '', avatar: '测',
  wallpaper: 'cream', buttonStyle: 'pill', buttonColor: 'wallpaper', links: [],
}

test('page validation rejects executable URLs and excessively large content', () => {
  assert.equal(validPageData(page), true)
  assert.equal(validPageData({ ...page, bio: 'x'.repeat(801) }), false)
  assert.equal(validPageData({ ...page, avatarImage: 'javascript:alert(1)' }), false)
  assert.equal(validPageData({ ...page, links: [{ url: 'javascript:alert(1)', platform: 'test', badge: '', accent: '', metric: '', value: '', insight: '' }] }), false)
})

test('public reads hide editing credentials; unauthorized writes cannot change a page', async () => {
  const originalFetch = globalThis.fetch
  const oldUrl = process.env.SUPABASE_URL
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  process.env.SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-server-key'
  const token = 'a'.repeat(43)
  const tokenHash = createHash('sha256').update(token).digest('hex')
  let writes = 0
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input))
    assert.equal(url.hostname, 'test.supabase.co')
    if (options?.method === 'POST' || options?.method === 'PATCH') {
      writes += 1
      const body = JSON.parse(String(options.body))
      if (options.method === 'POST') {
        assert.equal(body.edit_token_hash.length, 64)
        assert.notEqual(body.edit_token_hash, token)
        assert.equal(JSON.stringify(body.data).includes('editToken'), false)
        return new Response(null, { status: 201 })
      }
      assert.equal(url.searchParams.get('edit_token_hash'), `eq.${tokenHash}`)
      return Response.json([{ slug: 'abcdefghijkl' }])
    }
    if (url.searchParams.get('select') === 'edit_token_hash') return Response.json([{ edit_token_hash: tokenHash }])
    return Response.json([{ data: { ...page, slug: 'abcdefghijkl' }, updated_at: '2026-10-09T00:00:00Z' }])
  }
  const invoke = async (method: string, body?: unknown) => {
    let output = ''
    const res = { statusCode: 0, setHeader() {}, end(value: string) { output = value } }
    await handler({ method, url: '/api/pages?slug=abcdefghijkl', headers: { 'content-type': 'application/json' }, body }, res)
    return { status: res.statusCode, data: JSON.parse(output) }
  }
  try {
    const read = await invoke('GET')
    assert.equal(read.status, 200)
    assert.equal(JSON.stringify(read.data).includes('edit'), false)
    assert.equal((await invoke('POST', { data: page, slug: 'abcdefghijkl' })).status, 403)
    assert.equal((await invoke('POST', { data: page, slug: 'abcdefghijkl', editToken: 'b'.repeat(43) })).status, 403)
    assert.equal(writes, 0)
    const created = await invoke('POST', { data: page })
    assert.equal(created.status, 200)
    assert.match(created.data.slug, /^[A-Za-z0-9_-]{12}$/)
    assert.match(created.data.editToken, /^[A-Za-z0-9_-]{43}$/)
    assert.equal(created.data.data.slug, created.data.slug)
    assert.equal((await invoke('POST', { data: { ...page, name: '更新后' }, slug: 'abcdefghijkl', editToken: token })).status, 200)
    assert.equal(writes, 2)
  } finally {
    globalThis.fetch = originalFetch
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl
    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey
  }
})

test('unconfigured database fails explicitly instead of returning a fake published URL', async () => {
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  let output = ''
  const res = { statusCode: 0, setHeader() {}, end(value: string) { output = value } }
  try {
    await handler({ method: 'POST', body: { data: page } }, res)
    assert.equal(res.statusCode, 503)
    assert.equal(JSON.parse(output).error, 'storage-not-configured')
  } finally {
    if (oldKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey
  }
})
