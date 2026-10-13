import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { fetchFailureMessage, fetchPlatformMetrics } from '../src/dataFetch.js'

function browserTimers(t: TestContext) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { setTimeout, clearTimeout } })
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'window', previous)
    else Reflect.deleteProperty(globalThis, 'window')
  })
}

test('Huaban board reads collections when the page also exposes owner followers', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    ok: true, title: '花瓣作品的画板',
    metrics: [{ label: '粉丝', value: '800' }, { label: '采集', value: '111' }],
  })))
  browserTimers(t)
  const result = await fetchPlatformMetrics('花瓣网', 'https://huaban.com/boards/27823016')
  assert.equal(result?.metric, '采集')
  assert.equal(result?.value, '111')
})

test('Huaban profile still reads followers', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    ok: true, title: '设计师主页', metrics: [{ label: '粉丝', value: '800' }],
  })))
  browserTimers(t)
  assert.equal((await fetchPlatformMetrics('花瓣网', 'https://huaban.com/users/designer'))?.metric, '粉丝')
})

test('unavailable fallback is reported after the primary reader is blocked', async (t) => {
  browserTimers(t)
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
    return String(url).startsWith('/api/fetch')
      ? new Response(JSON.stringify({ ok: false, reason: 'site-blocked' }))
      : new Response(JSON.stringify({ ok: false, error: { code: 'webbridge-unavailable' } }), { status: 502 })
  })
  const failures: string[] = []
  assert.equal(await fetchPlatformMetrics('花瓣网', 'https://huaban.com/boards/27823016', (reason) => failures.push(reason)), null)
  assert.equal(failures.at(-1), 'webbridge-unavailable')
  assert.match(fetchFailureMessage(failures.at(-1)!), /备用读取服务/)
})

test('parallel platform reads use separate fallback browser sessions', async (t) => {
  browserTimers(t)
  const sessions: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, options?: RequestInit) => {
    if (String(url).startsWith('/api/fetch')) return new Response(JSON.stringify({ ok: false, reason: 'site-blocked' }))
    sessions.push(JSON.parse(String(options?.body)).session)
    return new Response(JSON.stringify({ ok: false, error: { code: 'webbridge-unavailable' } }), { status: 502 })
  })
  await Promise.all([
    fetchPlatformMetrics('花瓣网', 'https://huaban.com/boards/27823016'),
    fetchPlatformMetrics('Dribbble', 'https://dribbble.com/designer'),
  ])
  assert.equal(sessions.length, 2)
  assert.equal(new Set(sessions).size, 2)
})
