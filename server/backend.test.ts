import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractFromHtml, isEmptyShell } from './extract.js'
import { isPublicAddress, validateTarget } from './network.js'
import handler from '../api/fetch.js'
import webBridgeHandler from '../api/webbridge.js'
import { resolveWebBridgeUrl } from '../api/webbridge.js'
import { pageFailure } from './browser.js'
import { startBrowserProxy } from './browser-proxy.js'
import { createServer, request } from 'node:http'
import { parseGenericWebBridgeResult, parseHuabanPageData } from '../src/dataFetch'

test('parses Huaban board title, owner, collection count, and update time', () => {
  const result = parseHuabanPageData({
    title: '作品图片大全-作品高清好看的图片-花瓣cSummer的画板',
    text: '所属分类：\n平面\n111 张采集\n更新于 1 年前',
    owner: 'cSummer',
  })
  assert.deepEqual(result, {
    boardTitle: 'cSummer',
    owner: 'cSummer',
    collectionCount: 111,
    updatedAt: '1 年前',
  })
})

test('parses Huaban collection counts with commas and without 张', () => {
  assert.equal(
    parseHuabanPageData({ title: '花瓣Alice的画板', text: '1,234 采集\n更新于 昨天' })?.collectionCount,
    1234,
  )
})

test('keeps Huaban board owner separate from board title', () => {
  const result = parseHuabanPageData({
    title: '花瓣我的灵感画板的画板',
    text: '设计师小林个人\n24 张采集\n更新于 昨天',
    owner: '设计师小林',
  })
  assert.equal(result?.boardTitle, '我的灵感画板')
  assert.equal(result?.owner, '设计师小林')
})

test('normalizes generic WebBridge metrics and ignores malformed entries', () => {
  assert.deepEqual(parseGenericWebBridgeResult(JSON.stringify({
    title: '作品主页',
    stats: [{ label: '获赞', value: '1.2k' }, { label: '', value: 'bad' }],
  })), {
    title: '作品主页',
    stats: [{ label: '获赞', value: '1.2k' }],
  })
  assert.equal(parseGenericWebBridgeResult('{bad json'), null)
})

test('Dribbble public thumbnail JSON yields scoped likes instead of empty metrics', () => {
  const html = '<title>Summer Ching</title><script>var newestShots = ' + JSON.stringify([
    { id: 5091625, title: 'Admin ] " quoted', likes_count: '20', view_count: '817', ga: [] },
    { id: 5091624, likes_count: '23', view_count: '4k' },
    { id: 5091622, likes_count: '11', view_count: '1.9k' },
    { id: 5091625, likes_count: '20', view_count: '817' },
  ]) + '; Dribbble.Thumbnails.initialize();</script>'
  const result = extractFromHtml(html, 'https://dribbble.com/424096784emm')
  assert.ok(result.ok)
  assert.deepEqual(result.metrics, [
    { label: '本页获赞', value: '54' },
    { label: '本页浏览', value: '6717' },
    { label: '本页作品', value: '3' },
  ])
})

test('Dribbble counters support zero and abbreviated counts without inventing missing data', () => {
  const result = extractFromHtml('<script>var newestShots = [{"id":1,"likes_count":"1.2k"},{"id":2,"likes_count":"0"},{"id":3}];</script>', 'https://dribbble.com/designer')
  assert.ok(result.ok)
  assert.deepEqual(result.metrics, [{ label: '本页获赞', value: '1200' }, { label: '本页作品', value: '2' }])
  const malformed = extractFromHtml('<script>var newestShots = [notJson];</script>', 'https://dribbble.com/designer')
  assert.ok(malformed.ok)
  assert.deepEqual(malformed.metrics, [])
})

test('Huaban rejection and login pages report explicit failure reasons', () => {
  assert.equal(pageFailure(405, '出错了-花瓣网', '405：异常访问', 'https://huaban.com/space'), 'site-blocked')
  assert.equal(pageFailure(200, '登录', '', 'https://example.com/login'), 'login-required')
  assert.equal(pageFailure(200, '作品集', '1200 粉丝', 'https://example.com/profile'), null)
})

test('browser proxy blocks private destinations for both HTTP and CONNECT', async () => {
  const proxy = await startBrowserProxy()
  try {
    for (const method of ['GET', 'CONNECT']) {
      const status = await new Promise<number | undefined>((resolve, reject) => {
        const req = request(proxy.url, { method, path: method === 'CONNECT' ? '127.0.0.1:443' : 'http://169.254.169.254/' }, (res) => { res.resume(); resolve(res.statusCode) })
        req.on('connect', (res, socket) => { socket.destroy(); resolve(res.statusCode) })
        req.on('error', reject)
        req.end()
      })
      assert.equal(status, 403)
    }
  } finally { proxy.close() }
})

test('rejects non-public addresses and disguised URLs', () => {
  for (const url of [
    'file:///etc/passwd', 'http://127.1', 'http://2130706433',
    'http://169.254.169.254', 'http://100.64.0.1', 'http://[::ffff:127.0.0.1]',
    'http://[fc00::1]', 'http://localhost.', 'https://user:pass@example.com',
    'http://example.com:9222', 'http://10.0.0.1',
  ]) assert.equal(validateTarget(url), null, url)
  assert.equal(isPublicAddress('192.168.1.1'), false)
  assert.equal(isPublicAddress('8.8.8.8'), true)
  assert.equal(validateTarget('https://huaban.com/space')?.hostname, 'huaban.com')
})

test('extracts metadata and metrics, resolves relative images, excludes scripts', () => {
  const result = extractFromHtml('<title>作品 &amp; 设计</title><meta content="/cover.png" property="og:image"><script>9999 粉丝</script><body>粉丝：1200 32 画板</body>', 'https://example.com/profile')
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.title, '作品 & 设计')
  assert.equal(result.image, 'https://example.com/cover.png')
  assert.deepEqual(result.metrics.find((m) => m.label === '粉丝'), { label: '粉丝', value: '1200' })
  assert.ok(!result.metrics.some((m) => m.value === '9999'))
})

test('sums GitHub repository stars from the public profile HTML fallback', () => {
  const html = [
    '<title>xpzouying - Repositories</title>',
    '<a href="/xpzouying/one/stargazers"><svg></svg> 16,159</a>',
    '<a href="/xpzouying/two/stargazers"><svg></svg> 469</a>',
  ].join('')
  const result = extractFromHtml(html, 'https://github.com/xpzouying?tab=repositories')
  assert.ok(result.ok)
  assert.deepEqual(result.metrics, [{ label: 'Stars', value: '16628' }])
})

test('challenge and empty pages are not successful content', () => {
  assert.equal(isEmptyShell(extractFromHtml('<title>Just a moment...</title>', 'https://example.com')), true)
  assert.equal(isEmptyShell(extractFromHtml('<div id="app"></div>', 'https://example.com')), true)
  assert.equal(isEmptyShell(extractFromHtml('<title>作品集</title>', 'https://example.com')), false)
})

test('API rejects methods, invalid modes and private URLs without fetching', async () => {
  for (const [req, status, reason] of [
    [{ method: 'POST' }, 405, 'method-not-allowed'],
    [{ url: '/api/fetch?mode=invalid' }, 400, 'invalid-mode'],
    [{ url: '/api/fetch?url=http://127.0.0.1' }, 200, 'invalid-url'],
  ] as const) {
    let body = ''
    const headers: Record<string, string> = {}
    const res = { statusCode: 0, setHeader: (name: string, value: string) => { headers[name] = value }, end: (value: string) => { body = value } }
    await handler(req, res)
    assert.equal(res.statusCode, status)
    assert.equal(JSON.parse(body).reason, reason)
    assert.equal(headers['Cache-Control'], 'no-store')
  }
})

test('WebBridge proxy only accepts POST', async () => {
  let body = ''
  const res = {
    statusCode: 0,
    setHeader: () => undefined,
    end: (value: string) => { body = value },
  }
  await webBridgeHandler({ method: 'GET' }, res)
  assert.equal(res.statusCode, 405)
  assert.equal(JSON.parse(body).error.code, 'method-not-allowed')
})

test('WebBridge proxy uses the local daemon in development and public bridge on Vercel', () => {
  assert.equal(resolveWebBridgeUrl({}), 'http://127.0.0.1:10086/command')
  assert.equal(resolveWebBridgeUrl({ VERCEL: '1' }), 'http://39.107.124.201:18021/command')
  assert.equal(resolveWebBridgeUrl({ WEBBRIDGE_URL: 'https://bridge.example/command' }), 'https://bridge.example/command')
})

test('WebBridge proxy forwards commands without relying on global fetch', async () => {
  const upstream = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: true, received: JSON.parse(body) }))
    })
  })
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve))
  const address = upstream.address()
  assert.ok(address && typeof address === 'object')
  const previous = process.env.WEBBRIDGE_URL
  process.env.WEBBRIDGE_URL = `http://127.0.0.1:${address.port}/command`
  try {
    let body = ''
    const res = { statusCode: 0, setHeader: () => undefined, end: (value: string) => { body = value } }
    await webBridgeHandler({ method: 'POST', body: { action: 'snapshot', args: {} } }, res)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(JSON.parse(body), { ok: true, received: { action: 'snapshot', args: {} } })
  } finally {
    if (previous === undefined) delete process.env.WEBBRIDGE_URL
    else process.env.WEBBRIDGE_URL = previous
    await new Promise<void>((resolve, reject) => upstream.close((error) => error ? reject(error) : resolve()))
  }
})
