import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractFromHtml, isEmptyShell } from './extract.js'
import { isPublicAddress, validateTarget } from './network.js'
import handler from '../api/fetch.js'

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
