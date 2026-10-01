import puppeteer from 'puppeteer-core'
import { resolvePublic, validateTarget } from './network.js'

/** Remote browser must also enforce public-only network egress (including WebSockets/workers). */
export async function renderPage(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const endpoint = process.env.BROWSER_WS_ENDPOINT
  if (!endpoint) return null
  let browser: Awaited<ReturnType<typeof puppeteer.connect>> | undefined
  let context: Awaited<ReturnType<NonNullable<typeof browser>['createBrowserContext']>> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    browser = await puppeteer.connect({ browserWSEndpoint: endpoint, protocolTimeout: 8000 })
    const connection = browser
    timer = setTimeout(() => { void connection.disconnect() }, 25000)
    context = await browser.createBrowserContext()
    const page = await context.newPage()
    await page.setBypassServiceWorker(true)
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      void (async () => {
        const target = validateTarget(request.url())
        if (!target || ['media', 'font', 'image'].includes(request.resourceType())) {
          await request.abort()
          return
        }
        await resolvePublic(target)
        await request.continue()
      })().catch(() => { void request.abort().catch(() => {}) })
    })
    page.on('dialog', (dialog) => { void dialog.dismiss().catch(() => {}) })
    page.on('popup', (popup) => { void popup?.close().catch(() => {}) })
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' })
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    if (!response?.ok()) return null
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {})
    const finalUrl = page.url()
    if (!validateTarget(finalUrl)) return null
    // Compact the rendered DOM, preserving visible text and metadata without scripts.
    const content = await page.evaluate(() => ({
      title: document.title,
      meta: [...document.querySelectorAll('meta[property],meta[name]')]
        .map((element) => element.outerHTML).join(''),
      text: document.body.innerText.slice(0, 100000),
    }))
    const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const html = `<html><head><title>${escape(content.title)}</title>${content.meta}</head><body>${escape(content.text)}</body></html>`
    return { html, finalUrl }
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
    await context?.close().catch(() => {})
    await browser?.disconnect().catch(() => {})
  }
}
