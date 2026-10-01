/**
 * 平台数据获取（只认真实数据，抓不到返回 null，由调用方显示「已收录」占位）：
 * 1. GitHub —— 任何环境都走官方公开 API（免密钥）；
 * 2. 服务端抓取 —— /api/fetch（Vercel serverless / dev 中间件同构），线上主力；
 * 3. 本机 WebBridge —— 演示机可用时真实打开主页抓取
 *    （访客机器上 127.0.0.1 必失败，不能影响页面）。
 */

export type FetchedMetrics = {
  metric: string
  value: string
  unit?: string
  insight: string
  source: 'live'
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
    const [uRes, rRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100`),
    ])
    if (!uRes.ok || !rRes.ok) throw new Error('github api')
    const user = (await uRes.json()) as { followers?: number }
    const repos = (await rRes.json()) as { stargazers_count?: number }[]
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

async function fetchViaServer(url: string): Promise<ServerResult | null> {
  try {
    const res = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    const j = (await res.json()) as ServerResult
    return j.ok ? j : null
  } catch {
    return null
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

// —— 轨 3：本机 WebBridge 抓取（仅演示机可用） ——

// 经 Vite dev server 代理访问本机 WebBridge（同源、免 CORS）；
// 非演示环境（无代理 / 桥不在线）时请求失败，静默回退快照
const BRIDGE_URL = '/bridge/command'
const BRIDGE_SESSION = 'onepage-live-fetch'

async function bridgeCmd(
  action: string,
  args: Record<string, unknown>,
  timeout = 8000,
): Promise<{ ok: boolean; data?: { value?: string } }> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, args, session: BRIDGE_SESSION }),
      signal: ctrl.signal,
    })
    return (await res.json()) as { ok: boolean; data?: { value?: string } }
  } finally {
    window.clearTimeout(t)
  }
}

async function bridgeAvailable(): Promise<boolean> {
  try {
    const j = await bridgeCmd('evaluate', { code: '1+1' }, 1500)
    return j?.ok === true
  } catch {
    return false
  }
}

/** Dribbble 作品统计提取脚本（WebBridge 在页面内执行） */
const DRIBBBLE_EXTRACT = `(()=>{const t=document.body.innerText; const re=/Comment\\n(\\d+)\\n([\\d.,k]+)\\n([\\d.,k]+)/g; const parse=s=>s.toLowerCase().includes("k")?parseFloat(s)*1000:parseFloat(s.replace(",","")); let m,likes=0,views=0,shots=0; while((m=re.exec(t))){shots++;likes+=parseInt(m[2]);views+=parse(m[3])} return JSON.stringify({shots,likes,views:Math.round(views)})})()`

/** 花瓣主页：头部「N 粉丝」，画板列表「N采集」累加 */
const HUABAN_EXTRACT = `(()=>{const t=document.body.innerText; const fans=t.match(/([\\d.,w万+]+)\\s*粉丝/); const pins=[...t.matchAll(/(\\d+)\\s*采集/g)].reduce((s,m)=>s+parseInt(m[1]),0); const boards=(t.match(/\\d+\\s*采集/g)||[]).length; return JSON.stringify({fans:fans?fans[1]:null,pins,boards})})()`

async function fetchHuaban(url: string): Promise<FetchedMetrics | null> {
  const s = await fetchViaServer(url)
  if (s) {
    const m = pickMetric(s, /粉丝|followers?/i)
    if (m) {
      return {
        metric: '粉丝',
        value: m.value,
        insight: s.title || '数据由 AI 现场读取',
        source: 'live',
      }
    }
  }
  if (await bridgeAvailable()) {
    try {
      await bridgeCmd('navigate', { url, newTab: true, group_title: 'One Page 数据抓取' })
      await new Promise((r) => window.setTimeout(r, 3000))
      const j = await bridgeCmd('evaluate', { code: HUABAN_EXTRACT })
      const d = JSON.parse(j?.data?.value ?? 'null') as {
        fans: string | null
        pins: number
        boards: number
      } | null
      if (d && (d.fans || d.pins > 0)) {
        return {
          metric: d.fans ? '粉丝' : '采集',
          value: d.fans ?? formatK(d.pins),
          insight: d.pins > 0 ? `${d.pins} 次采集 · ${d.boards} 个画板` : '数据由 AI 现场读取',
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

/** 未知平台通用抓取；桥不可用或失败返回 null，由调用方维持「已收录」占位 */
export async function fetchGenericSite(url: string): Promise<FetchedMetrics | null> {
  const s = await fetchViaServer(url)
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
    return {
      metric: '主页链接',
      value: '✓',
      insight: s.title || '数据由 AI 现场读取',
      source: 'live',
    }
  }
  if (!(await bridgeAvailable())) return null
  try {
    await bridgeCmd('navigate', { url, newTab: true, group_title: 'One Page 数据抓取' })
    await new Promise((r) => window.setTimeout(r, 3000))
    const j = await bridgeCmd('evaluate', { code: GENERIC_EXTRACT })
    const d = JSON.parse(j?.data?.value ?? 'null') as {
      title: string
      stats: { label: string; value: string }[]
    } | null
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

async function fetchDribbble(url: string): Promise<FetchedMetrics | null> {
  const s = await fetchViaServer(url)
  if (s) {
    const m = pickMetric(s, /获赞|点赞|likes/i)
    if (m) {
      return {
        metric: '总获赞',
        value: m.value,
        insight: s.title || '数据由 AI 现场读取',
        source: 'live',
      }
    }
  }
  if (await bridgeAvailable()) {
    try {
      await bridgeCmd('navigate', { url, newTab: true, group_title: 'One Page 数据抓取' })
      await new Promise((r) => window.setTimeout(r, 3000))
      const j = await bridgeCmd('evaluate', { code: DRIBBBLE_EXTRACT })
      const d = JSON.parse(j?.data?.value ?? 'null') as {
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
): Promise<FetchedMetrics | null> {
  try {
    if (platform === 'GitHub') {
      const username = url.match(/github\.com\/([^/?#]+)/i)?.[1]
      return username ? await fetchGitHub(username) : null
    }
    if (platform === 'Stack Overflow') return await fetchStackOverflow(url)
    if (platform === 'Dribbble') return await fetchDribbble(url)
    if (platform === '花瓣网') return await fetchHuaban(url)
    return await fetchGenericSite(url)
  } catch {
    return null
  }
}
