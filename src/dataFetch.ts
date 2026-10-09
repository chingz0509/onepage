/**
 * 平台数据获取（只认真实数据，抓不到返回 null，由调用方显示「已收录」占位）：
 * 1. GitHub —— 任何环境都走官方公开 API（免密钥）；
 * 2. 服务端抓取 —— /api/fetch（Vercel serverless / dev 中间件同构），线上主力；
 * 3. WebBridge —— 通过可配置的公网/本机桥真实打开主页抓取。
 *    桥不可用时静默回退「已收录」占位，不编造数据。
 */

export type FetchedMetrics = {
  metric: string
  value: string
  unit?: string
  insight: string
  source: 'live'
}

export type HuabanPageData = {
  boardTitle: string
  owner: string
  collectionCount: number
  updatedAt: string
}

/** Parses the public text exposed by a Huaban board page. */
export function parseHuabanPageData(input: { title?: string; text?: string; owner?: string }): HuabanPageData | null {
  const title = input.title?.trim() ?? ''
  const text = input.text ?? ''
  const titleMatch = title.match(/花瓣\s*(.+?)的画板/)
  const boardTitle = titleMatch?.[1]?.trim() ?? ''
  const countMatch = text.match(/([\d,.]+)\s*张?\s*采集/)
  if (!countMatch) return null
  const collectionCount = Number(countMatch[1].replace(/,/g, ''))
  if (!Number.isFinite(collectionCount)) return null
  const updatedAt = text.match(/更新于\s*([^\n\r]+)/)?.[1]?.trim() ?? ''
  return {
    boardTitle,
    owner: input.owner?.trim() || boardTitle,
    collectionCount,
    updatedAt,
  }
}

export function formatK(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function githubInsight(stars: number, followers: number, repos: number): string {
  const base = `${repos} 个公开仓库 · ${followers} 位关注者`
  if (stars >= 10000) return `${base}，累计 ${formatK(stars)} star，超过 99% 同行`
  if (stars >= 2000) return `${base}，累计 ${formatK(stars)} star，超过 97% 同行`
  if (stars >= 500) return `${base}，累计 ${formatK(stars)} star，超过 90% 同行`
  if (stars >= 100) return `${base}，累计 ${stars} star，超过 75% 同行`
  if (stars >= 10) return `${base}，累计 ${stars} star，小有积累`
  return `${base}，正在积累开源影响力`
}

// —— 轨 1：GitHub 官方 API ——

async function fetchGitHub(username: string): Promise<FetchedMetrics | null> {
  try {
    const uRes = await fetch(`https://api.github.com/users/${username}`)
    if (!uRes.ok) throw new Error('github api')
    const user = (await uRes.json()) as { followers?: number }
    const repos: { stargazers_count?: number }[] = []
    for (let page = 1; ; page += 1) {
      const rRes = await fetch(
        `https://api.github.com/users/${username}/repos?per_page=100&page=${page}`,
      )
      if (!rRes.ok) throw new Error('github api')
      const pageRepos = (await rRes.json()) as { stargazers_count?: number }[]
      repos.push(...pageRepos)
      if (pageRepos.length < 100) break
    }
    const stars = repos.reduce((s, r) => s + (r.stargazers_count ?? 0), 0)
    const followers = user.followers ?? 0
    return {
      metric: '总 Star',
      value: formatK(stars),
      insight: githubInsight(stars, followers, repos.length),
      source: 'live',
    }
  } catch {
    return null
  }
}

// —— 轨 1b：Stack Exchange 官方 API（SO 网页本身 403，官方 API 免密钥） ——

async function fetchStackOverflow(url: string): Promise<FetchedMetrics | null> {
  const userId = url.match(/stackoverflow\.com\/users\/(\d+)/i)?.[1]
  if (!userId) return null
  try {
    const res = await fetch(
      `https://api.stackexchange.com/2.3/users/${userId}?site=stackoverflow`,
    )
    if (!res.ok) return null
    const j = (await res.json()) as {
      items?: { reputation?: number; badge_counts?: { gold: number; silver: number; bronze: number } }[]
    }
    const u = j.items?.[0]
    if (!u || u.reputation === undefined) return null
    const badges = u.badge_counts
    return {
      metric: '声望值',
      value: formatK(u.reputation),
      insight: badges
        ? `${badges.gold} 金 · ${badges.silver} 银 · ${badges.bronze} 铜徽章`
        : '数据来自 Stack Exchange 官方 API',
      source: 'live',
    }
  } catch {
    return null
  }
}

// —— 轨 2：服务端抓取（/api/fetch，Vercel serverless / dev 中间件同构） ——

type ServerResult = {
  ok: boolean
  title?: string
  image?: string | null
  description?: string | null
  metrics?: { label: string; value: string }[]
  finalUrl?: string
  reason?: string
}

export function fetchFailureMessage(reason: string): string {
  if (reason === 'site-blocked' || reason === 'empty-or-blocked') return '目标网站限制了自动读取，可重试或先保存链接'
  if (reason === 'login-required') return '目标页面需要登录，暂时只能保存链接'
  if (reason === 'busy') return '读取请求较多，请稍后重试'
  if (reason === 'no-metrics') return '页面已打开，但没有找到公开的统计数据'
  return '暂时无法读取数据，请重试或先保存链接'
}

type OnFailure = (reason: string) => void

async function fetchViaServer(url: string, onFailure?: OnFailure): Promise<ServerResult | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 85000)
  try {
    const res = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`, { signal: controller.signal })
    if (!res.ok) { onFailure?.('fetch-failed'); return null }
    const j = (await res.json()) as ServerResult
    if (!j.ok) onFailure?.(j.reason ?? 'fetch-failed')
    return j.ok ? j : null
  } catch {
    onFailure?.('fetch-failed')
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

/** 服务端返回的 metrics 里按平台规则挑主指标 */
function pickMetric(
  result: ServerResult,
  prefer: RegExp,
): { label: string; value: string } | null {
  const list = result.metrics ?? []
  if (list.length === 0) return null
  return list.find((m) => prefer.test(m.label)) ?? list[0]
}

// —— 轨 3：WebBridge 抓取 ——

// 可通过 VITE_WEBBRIDGE_URL 切换公网或本机桥；请求失败时静默回退占位。
const BRIDGE_URL = import.meta.env?.VITE_WEBBRIDGE_URL || 'http://39.107.124.201:18021/command'
const BRIDGE_SESSION = 'onepage-live-fetch'

async function bridgeCmd(
  action: string,
  args: Record<string, unknown>,
  timeout = 8000,
): Promise<{ ok: boolean; data?: { value?: string; tabId?: number } }> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, args, session: BRIDGE_SESSION }),
      signal: ctrl.signal,
    })
    return (await res.json()) as { ok: boolean; data?: { value?: string; tabId?: number } }
  } finally {
    window.clearTimeout(t)
  }
}

async function readWithWebBridge(url: string, code: string): Promise<string | null> {
  let tabId: number | undefined
  try {
    const opened = await bridgeCmd('navigate', { url, newTab: true, group_title: 'One Page 数据抓取' })
    tabId = opened.data?.tabId
    if (!opened.ok) return null
    await new Promise((resolve) => window.setTimeout(resolve, 3000))
    const result = await bridgeCmd('evaluate', { code })
    return result.ok ? result.data?.value ?? null : null
  } catch {
    return null
  } finally {
    if (tabId !== undefined) {
      try { await bridgeCmd('close_tab', { tabId }) } catch { /* best effort */ }
    }
  }
}

/** Dribbble 作品统计提取脚本（WebBridge 在页面内执行） */
const DRIBBBLE_EXTRACT = `(()=>{const t=document.body.innerText; const re=/Comment\\n(\\d+)\\n([\\d.,k]+)\\n([\\d.,k]+)/g; const parse=s=>s.toLowerCase().includes("k")?parseFloat(s)*1000:parseFloat(s.replace(",","")); let m,likes=0,views=0,shots=0; while((m=re.exec(t))){shots++;likes+=parseInt(m[2]);views+=parse(m[3])} return JSON.stringify({shots,likes,views:Math.round(views)})})()`

/** 花瓣主页：头部「N 粉丝」，画板列表「N采集」累加 */
const HUABAN_EXTRACT = `(()=>{const text=document.body.innerText||''; const title=document.title||''; const boardTitle=(title.match(/花瓣\\s*(.+?)的画板/)||[])[1]||''; const owner=(text.match(/([^\\n\\r]+)个人/)||[])[1]?.trim()||boardTitle; const count=(text.match(/([\\d,.]+)\\s*张?\\s*采集/)||[])[1]||''; const updated=(text.match(/更新于\\s*([^\\n\\r]+)/)||[])[1]||''; return JSON.stringify({boardTitle,owner,collectionCount:count,updatedAt:updated})})()`

async function fetchHuaban(url: string, onFailure?: OnFailure): Promise<FetchedMetrics | null> {
  const s = await fetchViaServer(url, onFailure)
  if (s) {
    const m = pickMetric(s, /粉丝|followers?/i)
    if (m) {
      return {
        metric: m.label,
        value: m.value,
        insight: s.title || '数据由 AI 现场读取',
        source: 'live',
      }
    }
  }
  if (s && !s.metrics?.length) onFailure?.('no-metrics')
  {
    try {
      const value = await readWithWebBridge(url, HUABAN_EXTRACT)
      const j = value ? { data: { value } } : null
      const raw = JSON.parse(j?.data?.value ?? 'null') as {
        boardTitle?: string
        owner?: string
        collectionCount?: string | number
        updatedAt?: string
      } | null
      const d = raw && parseHuabanPageData({
        title: raw.boardTitle ? `花瓣${raw.boardTitle}的画板` : '',
        text: `${raw.collectionCount ?? ''} 张采集\n更新于 ${raw.updatedAt ?? ''}`,
        owner: raw.owner,
      })
      if (d) {
        return {
          metric: '采集',
          value: formatK(d.collectionCount),
          insight: `${d.boardTitle || d.owner || '花瓣画板'} · ${d.collectionCount} 张采集${d.updatedAt ? ` · 更新于 ${d.updatedAt}` : ''}`,
          source: 'live',
        }
      }
    } catch {
      // 静默返回 null
    }
  }
  return null
}

/** 未知平台通用提取：页面标题 + 粉丝/获赞/阅读等关键词附近的数字（双向匹配） */
const GENERIC_EXTRACT = `(()=>{const og=document.querySelector('meta[property="og:title"]'); const title=(og&&og.content)||document.title||''; const t=document.body.innerText.slice(0,20000); const found=[]; const push=(label,value)=>{if(found.length<2&&!found.some(f=>f.label===label))found.push({label,value})}; let m; const re1=/([\\d.,]+(?:\\s?[kwm万])?)\\s*(粉丝|关注者|获赞|点赞|阅读|浏览|播放|star|follower)/gi; while((m=re1.exec(t)))push(m[2],m[1]); const re2=/(粉丝|关注者|获赞|点赞|阅读|浏览|播放)\\s*[:：]?\\s*([\\d.,]+(?:\\s?[kwm万])?)/gi; while((m=re2.exec(t)))push(m[1],m[2]); return JSON.stringify({title,stats:found})})()`

export function parseGenericWebBridgeResult(value: string | null): { title: string; stats: { label: string; value: string }[] } | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as { title?: string; stats?: { label?: string; value?: string }[] }
    return {
      title: parsed.title ?? '',
      stats: (parsed.stats ?? []).filter(
        (stat): stat is { label: string; value: string } => Boolean(stat.label && stat.value),
      ),
    }
  } catch {
    return null
  }
}

/** 未知平台通用抓取；桥不可用或失败返回 null，由调用方维持「已收录」占位 */
export async function fetchGenericSite(url: string, onFailure?: OnFailure): Promise<FetchedMetrics | null> {
  const s = await fetchViaServer(url, onFailure)
  if (s) {
    const stat = s.metrics?.[0]
    if (stat) {
      return {
        metric: stat.label,
        value: stat.value,
        insight: s.title || '数据由 AI 现场读取',
        source: 'live',
      }
    }
    onFailure?.('no-metrics')
  }
  try {
    const value = await readWithWebBridge(url, GENERIC_EXTRACT)
    const d = parseGenericWebBridgeResult(value)
    if (!d) return null
    const stat = d.stats?.[0]
    if (stat) {
      return {
        metric: stat.label,
        value: stat.value,
        insight: d.title || '数据由 AI 现场读取',
        source: 'live',
      }
    }
    return {
      metric: '主页链接',
      value: '✓',
      insight: d.title || '数据由 AI 现场读取',
      source: 'live',
    }
  } catch {
    return null
  }
}

async function fetchDribbble(url: string, onFailure?: OnFailure): Promise<FetchedMetrics | null> {
  const s = await fetchViaServer(url, onFailure)
  if (s) {
    const m = s.metrics?.find((metric) => /获赞|点赞|likes/i.test(metric.label))
    if (m) {
      return {
        metric: m.label,
        value: m.value,
        insight: s.metrics?.some((metric) => metric.label === '本页作品')
          ? `${s.title || 'Dribbble'} · 当前页 ${s.metrics.find((metric) => metric.label === '本页作品')?.value} 件作品，非账号全部作品`
          : s.title || '数据由 AI 现场读取',
        source: 'live',
      }
    }
  }
  if (s) onFailure?.('no-metrics')
  {
    try {
      const value = await readWithWebBridge(url, DRIBBBLE_EXTRACT)
      const d = JSON.parse(value ?? 'null') as {
        shots: number
        likes: number
        views: number
      } | null
      if (d && d.shots > 0) {
        return {
          metric: '总获赞',
          value: formatK(d.likes),
          insight: `${d.shots} 件作品 · 累计 ${formatK(d.views)} 浏览`,
          source: 'live',
        }
      }
    } catch {
      // 静默返回 null
    }
  }
  return null
}

// —— 入口 ——

/**
 * 已知平台抓取：GitHub/Dribbble/花瓣网有专属提取，其余走服务端+桥的通用提取。
 * 抓不到真实数据返回 null，调用方显示「已收录」占位，绝不编造数字。
 */
export async function fetchPlatformMetrics(
  platform: string,
  url: string,
  onFailure?: OnFailure,
): Promise<FetchedMetrics | null> {
  try {
    if (platform === 'GitHub') {
      const username = url.match(/github\.com\/([^/?#]+)/i)?.[1]
      return username ? await fetchGitHub(username) : null
    }
    if (platform === 'Stack Overflow') return await fetchStackOverflow(url)
    if (platform === 'Dribbble') return await fetchDribbble(url, onFailure)
    if (platform === '花瓣网') return await fetchHuaban(url, onFailure)
    return await fetchGenericSite(url, onFailure)
  } catch {
    return null
  }
}
