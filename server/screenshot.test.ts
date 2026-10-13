import test from 'node:test'
import assert from 'node:assert/strict'
import { createScreenshotHandler } from '../api/screenshot.js'
import type { BrowserResult } from './browser.js'
import { fetchGenericSite } from '../src/dataFetch.js'

async function configured(run: () => Promise<void>) {
  const previousUrl = process.env.SUPABASE_URL
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  process.env.SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  try { await run() }
  finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey
  }
}

async function invoke(handler: ReturnType<typeof createScreenshotHandler>, url: string, method = 'GET') {
  let body = ''
  const response = { statusCode: 0, setHeader() {}, end(value: string) { body = value } }
  await handler({ method, query: { url } }, response)
  return { status: response.statusCode, result: JSON.parse(body) }
}

test('preview requests reject private targets and unsupported methods before opening a browser', async () => {
  let captures = 0
  const handler = createScreenshotHandler({
    renderPage: async () => { captures++; return { reason: 'unexpected' } },
    storePreview: async () => { throw new Error('unexpected storage') },
  })
  for (const url of ['http://localhost/', 'http://127.0.0.1/', 'http://169.254.169.254/', 'file:///etc/passwd', 'https://user:pass@example.com/']) {
    assert.equal((await invoke(handler, url)).status, 400)
  }
  assert.equal((await invoke(handler, 'https://example.com/', 'POST')).status, 405)
  assert.equal(captures, 0)
})

test('captures are stored as public URLs and shared between repeated requests', async () => configured(async () => {
  let captures = 0, writes = 0
  const bytes = Buffer.from([0xff, 0xd8, 0xff])
  const handler = createScreenshotHandler({
    renderPage: async (url, options): Promise<BrowserResult> => {
      captures++
      assert.equal(options?.screenshot, true)
      return { html: '', finalUrl: url, title: 'Personal website', screenshot: bytes }
    },
    storePreview: async (data) => { writes++; assert.deepEqual(data, bytes); return 'https://test.supabase.co/storage/v1/object/public/onepage-avatars/previews/image.jpg' },
  })
  const results = await Promise.all([invoke(handler, 'https://example.com/'), invoke(handler, 'https://example.com/')])
  assert.equal(results[0].result.ok, true)
  assert.equal(results[0].result.title, 'Personal website')
  assert.match(results[0].result.previewImage, /^https:/)
  assert.equal(JSON.stringify(results[0]).includes('base64'), false)
  await invoke(handler, 'https://example.com/')
  assert.equal(captures, 1)
  assert.equal(writes, 1)
}))

test('blocked pages and upload failures return a fallback and permit a later retry', async () => configured(async () => {
  let captures = 0
  const handler = createScreenshotHandler({
    renderPage: async (url): Promise<BrowserResult> => {
      captures++
      return captures === 1 ? { reason: 'site-blocked' } : { html: '', finalUrl: url, screenshot: Buffer.from([0xff, 0xd8]) }
    },
    storePreview: async () => { throw new Error('storage failure') },
  })
  assert.deepEqual((await invoke(handler, 'https://example.com/')).result, { ok: false, reason: 'site-blocked' })
  assert.deepEqual((await invoke(handler, 'https://example.com/')).result, { ok: false, reason: 'preview-unavailable' })
  assert.equal(captures, 2)
}))

test('personal websites without statistics remain collectable when screenshot capture fails', async () => {
  const previousFetch = globalThis.fetch
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { setTimeout, clearTimeout } })
  try {
    for (const screenshotWorks of [true, false]) {
      let requests = 0
      globalThis.fetch = async (input) => {
        requests++
        if (String(input).startsWith('/api/screenshot')) return Response.json(screenshotWorks
          ? { ok: true, previewImage: 'https://example.com/first-screen.jpg', title: 'My website' }
          : { ok: false, reason: 'browser-unavailable' })
        assert.ok(String(input).startsWith('/api/fetch'))
        return Response.json({ ok: true, title: 'My website', metrics: [] })
      }
      const result = await fetchGenericSite('https://example.com/')
      assert.equal(result?.value, '✓')
      assert.equal(result?.insight, 'My website')
      assert.equal(result?.previewImage, screenshotWorks ? 'https://example.com/first-screen.jpg' : undefined)
      assert.equal(requests, 2)
    }
  } finally {
    globalThis.fetch = previousFetch
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
