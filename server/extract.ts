/**
 * 服务端抓取的共享核心：URL 校验（SSRF 防护）+ 拉 HTML + 提取标题/图片/描述/数字指标。
 * api/fetch.ts（Vercel serverless）与 vite.config.ts（dev 中间件）共用。
 */

import { fetchPublicHtml, validateTarget } from './network.js'
import { renderPage } from './browser.js'

export { validateTarget } from './network.js'
export type SiteMetric = { label: string; value: string }

export type FetchResult =
  | {
      ok: true
      title: string
      image: string | null
      description: string | null
      metrics: SiteMetric[]
      finalUrl: string
      source?: 'http' | 'browser' | 'scraper'
    }
  | { ok: false; reason: string }

/**
 * 商业抓取服务二级回退（应对 EdgeOne/空壳等 JS 挑战站点，如花瓣网、掘金）。
 * 配了环境变量才启用：SCRAPER_PROVIDER = zenrows | scrapingbee，SCRAPER_API_KEY = <key>。
 * 两家都自带 JS 渲染 + 住宅代理；未配置时整层静默跳过。
 */
function scraperEndpoint(target: string): string | null {
  const key = process.env.SCRAPER_API_KEY
  const provider = process.env.SCRAPER_PROVIDER
  if (!key || !provider) return null
  const u = encodeURIComponent(target)
  if (provider === 'zenrows') {
    return `https://api.zenrows.com/v1/?apikey=${key}&url=${u}&js_render=true&premium_proxy=true`
  }
  if (provider === 'scrapingbee') {
    return `https://app.scrapingbee.com/api/v1?api_key=${key}&url=${u}&render_js=true&premium_proxy=true`
  }
  return null
}

function metaContent(html: string, key: string, attr: 'property' | 'name'): string | null {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`,
    'i',
  )
  const rev = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`,
    'i',
  )
  return (html.match(re)?.[1] ?? html.match(rev)?.[1] ?? null) || null
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

const METRIC_WORDS = '粉丝|关注者|获赞|点赞|阅读|浏览|播放|采集|画板|stars?|followers?|likes'
const NUM = '[\\d.,]+(?:\\s?[kwm万ＫＷＭ])?\\+?'

function extractMetrics(html: string): SiteMetric[] {
  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
  const found: SiteMetric[] = []
  const push = (label: string, value: string) => {
    const l = label.trim()
    const v = value.trim()
    if (!v || found.some((f) => f.label === l)) return
    if (found.length < 2) found.push({ label: l, value: v })
  }
  const re1 = new RegExp(`(${NUM})\\s*(${METRIC_WORDS})`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re1.exec(text))) push(m[2], m[1])
  const re2 = new RegExp(`(${METRIC_WORDS})\\s*[:：]?\\s*(${NUM})`, 'gi')
  while ((m = re2.exec(text))) push(m[1], m[2])
  return found
}

export function extractFromHtml(html: string, finalUrl: string): FetchResult {
  const ogTitle = metaContent(html, 'og:title', 'property')
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''
  const title = decodeEntities(ogTitle ?? titleTag)
  const rawImage = metaContent(html, 'og:image', 'property')
  let image: string | null = null
  try {
    const resolved = new URL(decodeEntities(rawImage ?? ''), finalUrl)
    if (rawImage && ['http:', 'https:'].includes(resolved.protocol)) image = resolved.href
  } catch { /* Invalid images are omitted. */ }
  const description =
    metaContent(html, 'og:description', 'property') ??
    metaContent(html, 'description', 'name')

  return {
    ok: true,
    title,
    image,
    description: description ? decodeEntities(description) : null,
    metrics: extractMetrics(html),
    finalUrl,
  }
}

/** 空壳判定：挑战页/SPA 壳通常连标题都没有，也没有任何数字指标 */
export function isEmptyShell(r: FetchResult): boolean {
  return r.ok && (
    (!r.title && !r.description && r.metrics.length === 0) ||
    /just a moment|access denied|security verification|verify you are human|安全验证|人机验证|验证码|访问受限|出错了|异常访问/i.test(r.title)
  )
}

export async function fetchAndExtract(raw: string | null | undefined, mode: 'auto' | 'browser' = 'auto'): Promise<FetchResult> {
  const target = validateTarget(raw)
  if (!target) return { ok: false, reason: 'invalid-url' }
  const url = target.toString()

  // 一级：直连（大多数公开站点这样就够了）
  const page = mode === 'auto' ? await fetchPublicHtml(url, 8000) : null
  const direct = page ? extractFromHtml(page.html, page.finalUrl) : null
  // A title alone can belong to a JS shell. Try rendering when no metrics are present.
  if (direct?.ok && !isEmptyShell(direct) && direct.metrics.length) return { ...direct, source: 'http' }

  const rendered = await renderPage(url)
  if ('html' in rendered) {
    const result = extractFromHtml(rendered.html, rendered.finalUrl)
    if (result.ok && !isEmptyShell(result)) return { ...result, source: 'browser' }
  }
  if (mode === 'browser') return { ok: false, reason: 'reason' in rendered ? rendered.reason : 'empty-or-blocked' }

  // 二级：商业抓取服务（JS 渲染 + 住宅代理），专治挑战页/空壳
  const endpoint = scraperEndpoint(url)
  if (endpoint) {
    const scraped = await fetchPublicHtml(endpoint, 20000)
    if (scraped) {
      const viaScraper = extractFromHtml(scraped.html, url)
      if (viaScraper.ok && !isEmptyShell(viaScraper)) return { ...viaScraper, source: 'scraper' }
    }
  }

  if (direct?.ok && !isEmptyShell(direct)) return { ...direct, source: 'http' }
  return { ok: false, reason: 'reason' in rendered ? rendered.reason : 'empty-or-blocked' }
}
