import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'

// Run against a running app: node scripts/test-link-input.mjs [app URL].
// Override BROWSER_URL to use a different isolated Chrome debugging endpoint.
const base = process.argv[2] || 'http://localhost:5173/'
const browser = await puppeteer.connect({
  browserURL: process.env.BROWSER_URL || 'http://127.0.0.1:9331', defaultViewport: null,
})
const context = await browser.createBrowserContext()
const url = 'https://dribbble.com/424096784emm'
try {
  const page = await context.newPage()
  await page.setViewport({ width: 393, height: 852 })
  const requests = []
  await page.setRequestInterception(true)
  page.on('request', request => {
    if (!request.url().includes('/api/fetch?')) { void request.continue(); return }
    requests.push(new URL(request.url()).searchParams.get('url'))
    void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({
      ok: true, title: 'Summer Ching', metrics: [{ label: '本页获赞', value: '382' }],
    }) })
  })
  const open = async () => {
    await page.goto('about:blank')
    await page.goto(base + '#/new', { waitUntil: 'networkidle0' })
    await page.$eval('.ep-continue', button => button.click())
    await page.waitForSelector('.lk-input')
    requests.length = 0
  }
  const resolved = async () => {
    await page.waitForSelector('.lk-completed', { timeout: 6500 }).catch(async error => { console.error(JSON.stringify({ requests, slots: await page.$$eval('.lk-slot', els => els.map(el => ({ reading: el.getAttribute('aria-busy'), text: el.textContent }))) })); throw error })
    assert.match(await page.$eval('.lk-completed', el => el.textContent), /382/)
    assert.deepEqual(requests, [url], 'Each completed input must start exactly one request')
  }
  await open()
  await page.locator('.lk-input').fill(url)
  await resolved()
  console.log('PASS: typing a complete URL automatically resolves a card')

  await open()
  await page.$eval('.lk-input', (input, value) => {
    const clipboardData = new DataTransfer()
    clipboardData.setData('text', value)
    input.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }))
  }, url)
  await page.locator('.lk-input').fill(url.replace('424096784emm', 'replacement'))
  await page.locator('.lk-input').fill(url)
  await page.keyboard.press('Enter')
  await resolved()
  console.log('PASS: paste, edit, then Enter reads only the current URL once')

  await open()
  await page.locator('.lk-input').fill(url)
  await page.keyboard.press('Tab')
  await resolved()
  console.log('PASS: leaving the input reads the URL once')

  await open()
  await page.locator('.lk-input').fill(url)
  await page.$eval('.lk-input', input => { input.focus(); input.select() })
  await page.keyboard.press('Backspace')
  assert.equal(await page.$eval('.lk-input', input => input.value), '')
  await new Promise(resolve => setTimeout(resolve, 1500))
  assert.equal(requests.length, 0)
  await page.locator('.lk-input').fill('Summer Ching')
  await new Promise(resolve => setTimeout(resolve, 1500))
  assert.equal(requests.length, 0)
  console.log('PASS: clearing input or entering a name does not send a request')
} finally {
  await context.close()
  await browser.disconnect()
}
