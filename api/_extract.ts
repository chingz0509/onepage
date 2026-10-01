/**
 * 服务端抓取的共享核心：URL 校验（SSRF 防护）+ 拉 HTML + 提取标题/图片/描述/数字指标。
 * api/fetch.ts（Vercel serverless）与 vite.config.ts（dev 中间件）共用。
 */

export type SiteMetric = { label: string; value: string }

export type FetchResult =
  | {
      ok: true
      title: string
      image: string | null
      description: string | null
      metrics: SiteMetric[]
      finalUrl: string
    }
  | { ok: false; reason: string }

const PRIVATE_HOST =
  /^(localhost|0\.0\.0\.0|\[::1\])$|^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|\.(local|internal|lan)$/i

/** 校验目标 URL：仅 http(s)，拒绝内网/本机地址 */
export function validateTarget(raw: string | null | undefined): URL | null {
  if (!raw) return null
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  if (PRIVATE_HOST.test(u.hostname)) return null
  return u
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

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

async function fetchHtml(url: string, timeoutMs: number): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })
    if (!res.ok || !res.body) return null
    return await readLimited(res.body)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const MAX_BYTES = 512 * 1024

async function readLimited(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done || !value) break
    chunks.push(value)
    total += value.length
    if (total >= MAX_BYTES) {
      await reader.cancel()
      break
    }
  }
  const buf = new Uint8Array(Math.min(total, MAX_BYTES))
  let offset = 0
  for (const c of chunks) {
    if (offset >= buf.length) break
    buf.set(c.subarray(0, buf.length - offset), offset)
    offset += c.length
  }
  return new TextDecoder('utf-8').decode(buf)
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

function extractFromHtml(html: string, finalUrl: string): FetchResult {
  const ogTitle = metaContent(html, 'og:title', 'property')
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''
  const title = decodeEntities(ogTitle ?? titleTag)
  const image = metaContent(html, 'og:image', 'property')
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
function isEmptyShell(r: FetchResult): boolean {
  return r.ok && r.title === '' && r.metrics.length === 0
}

export async function fetchAndExtract(raw: string | null | undefined): Promise<FetchResult> {
  const target = validateTarget(raw)
  if (!target) return { ok: false, reason: 'invalid-url' }
  const url = target.toString()

  // 一级：直连（大多数公开站点这样就够了）
  const html = await fetchHtml(url, 8000)
  if (html) {
    const direct = extractFromHtml(html, url)
    if (!isEmptyShell(direct)) return direct
  }

  // 二级：商业抓取服务（JS 渲染 + 住宅代理），专治挑战页/空壳
  const endpoint = scraperEndpoint(url)
  if (endpoint) {
    const rendered = await fetchHtml(endpoint, 25000)
    if (rendered) {
      const viaScraper = extractFromHtml(rendered, url)
      if (!isEmptyShell(viaScraper)) return viaScraper
    }
  }

  return html ? extractFromHtml(html, url) : { ok: false, reason: 'fetch-failed' }
}
