import puppeteer from 'puppeteer-core'
import { resolvePublic, validateTarget } from './network.js'
import chromium from '@sparticuz/chromium'
import { startBrowserProxy } from './browser-proxy.js'

export type BrowserResult = { html: string; finalUrl: string } | { reason: string }
let activeBrowsers = 0

export function pageFailure(status: number, title: string, text: string, url: string): string | null {
  if (/异常访问|访问被阻止|安全验证|人机验证|验证码|access denied|just a moment|verify you are human/i.test(title + text.slice(0, 1500)) || [403, 405, 429].includes(status)) return 'site-blocked'
  if (status >= 400 || !status) return 'page-unavailable'
  if (/\/login|\/signin/.test(new URL(url).pathname) || /^(登录|登陆|sign in|log in)/i.test(title)) return 'login-required'
  return null
}

/** Remote browser must also enforce public-only network egress (including WebSockets/workers). */
export async function renderPage(url: string): Promise<BrowserResult> {
  const endpoint = process.env.BROWSER_WS_ENDPOINT
  if (activeBrowsers >= 2) return { reason: 'busy' }
  activeBrowsers++
  let proxy: Awaited<ReturnType<typeof startBrowserProxy>> | undefined
  let browser: Awaited<ReturnType<typeof puppeteer.connect>> | undefined
  let context: Awaited<ReturnType<NonNullable<typeof browser>['createBrowserContext']>> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let started = false
  try {
    if (endpoint) {
      browser = await puppeteer.connect({ browserWSEndpoint: endpoint, protocolTimeout: 8000 })
    } else {
      proxy = await startBrowserProxy()
      const localPath = process.env.CHROME_EXECUTABLE_PATH
      browser = await puppeteer.launch({
        executablePath: localPath || await chromium.executablePath(),
        args: [
          ...(localPath ? [] : chromium.args.filter((arg) => arg !== '--single-process')),
          `--proxy-server=${proxy.url}`, '--proxy-bypass-list=<-loopback>',
          '--disable-quic', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
        ],
        headless: localPath ? true : 'shell',
        timeout: 15000, protocolTimeout: 10000,
      })
    }
    started = true
    const connection = browser
    timer = setTimeout(() => {
      if (endpoint) void connection.disconnect()
      else connection.process()?.kill('SIGKILL')
    }, 30000)
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
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {})
    const finalUrl = page.url()
    if (!validateTarget(finalUrl)) return { reason: 'blocked-target' }
    // Compact the rendered DOM, preserving visible text and metadata without scripts.
    const content = await page.evaluate(() => ({
      title: document.title,
      meta: [...document.querySelectorAll('meta[property],meta[name]')]
        .map((element) => element.outerHTML).join(''),
      text: document.body.innerText.slice(0, 100000),
      // Thumbnail statistics are script data and are lost by innerText alone.
      shotData: /^(www\.)?dribbble\.com$/.test(location.hostname)
        ? [...document.scripts].filter((script) => /\bnewestShots\s*=/.test(script.textContent ?? ''))
          .map((script) => script.textContent).join('\n').slice(0, 200000)
        : '',
    }))
    const failure = pageFailure(response?.status() ?? 0, content.title, content.text, finalUrl)
    if (failure) return { reason: failure }
    const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const html = `<html><head><title>${escape(content.title)}</title>${content.meta}</head><body>${escape(content.text)}<script>${content.shotData}</script></body></html>`
    return { html, finalUrl }
  } catch (error) {
    // Log only the error class, never endpoint credentials or page content.
    console.warn('[browser-fetch]', started ? 'navigation' : 'startup', error instanceof Error ? error.name : 'Error')
    return { reason: started ? 'browser-fetch-failed' : 'browser-unavailable' }
  } finally {
    if (timer) clearTimeout(timer)
    await context?.close().catch(() => {})
    if (endpoint) await browser?.disconnect().catch(() => {})
    else await browser?.close().catch(() => {})
    proxy?.close()
    activeBrowsers--
  }
}
