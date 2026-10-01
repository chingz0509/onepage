/**
 * 三轨制平台数据获取：
 * 1. GitHub —— 任何环境都走官方公开 API（免密钥），失败回退快照；
 * 2. Dribbble —— 检测本机 WebBridge（127.0.0.1:10086）可用时真实打开主页抓取，
 *    不可用或抓取失败静默回退快照（访客机器上 127.0.0.1 必失败，不能影响页面）；
 * 3. 其他平台 —— 直接使用 dataSnapshot 里的真实快照值。
 */

import { PLATFORM_SNAPSHOTS, type PlatformSnapshot } from './dataSnapshot'

export type FetchedMetrics = PlatformSnapshot & { source: 'live' | 'snapshot' }

function snapshot(platform: string): FetchedMetrics {
  const base = PLATFORM_SNAPSHOTS[platform] ?? {
    metric: '主页链接',
    value: '✓',
    insight: '',
  }
  return { ...base, source: 'snapshot' }
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

async function fetchGitHub(username: string): Promise<FetchedMetrics> {
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
    return snapshot('GitHub')
  }
}

// —— 轨 2：本机 WebBridge 抓取（仅演示机可用） ——

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

/** 与 dataSnapshot 抓取时一致的 Dribbble 作品统计提取脚本 */
const DRIBBBLE_EXTRACT = `(()=>{const t=document.body.innerText; const re=/Comment\\n(\\d+)\\n([\\d.,k]+)\\n([\\d.,k]+)/g; const parse=s=>s.toLowerCase().includes("k")?parseFloat(s)*1000:parseFloat(s.replace(",","")); let m,likes=0,views=0,shots=0; while((m=re.exec(t))){shots++;likes+=parseInt(m[2]);views+=parse(m[3])} return JSON.stringify({shots,likes,views:Math.round(views)})})()`

/** 花瓣主页：头部「N 粉丝」，画板列表「N采集」累加 */
const HUABAN_EXTRACT = `(()=>{const t=document.body.innerText; const fans=t.match(/([\\d.,w万+]+)\\s*粉丝/); const pins=[...t.matchAll(/(\\d+)\\s*采集/g)].reduce((s,m)=>s+parseInt(m[1]),0); const boards=(t.match(/\\d+\\s*采集/g)||[]).length; return JSON.stringify({fans:fans?fans[1]:null,pins,boards})})()`

async function fetchHuaban(url: string): Promise<FetchedMetrics> {
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
      // 静默走快照
    }
  }
  return snapshot('花瓣网')
}

/** 未知平台通用提取：页面标题 + 粉丝/获赞/阅读等关键词附近的数字（双向匹配） */
const GENERIC_EXTRACT = `(()=>{const og=document.querySelector('meta[property="og:title"]'); const title=(og&&og.content)||document.title||''; const t=document.body.innerText.slice(0,20000); const found=[]; const push=(label,value)=>{if(found.length<2&&!found.some(f=>f.label===label))found.push({label,value})}; let m; const re1=/([\\d.,]+(?:\\s?[kwm万])?)\\s*(粉丝|关注者|获赞|点赞|阅读|浏览|播放|star|follower)/gi; while((m=re1.exec(t)))push(m[2],m[1]); const re2=/(粉丝|关注者|获赞|点赞|阅读|浏览|播放)\\s*[:：]?\\s*([\\d.,]+(?:\\s?[kwm万])?)/gi; while((m=re2.exec(t)))push(m[1],m[2]); return JSON.stringify({title,stats:found})})()`

/** 未知平台通用抓取；桥不可用或失败返回 null，由调用方维持「已收录」占位 */
export async function fetchGenericSite(url: string): Promise<FetchedMetrics | null> {
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

async function fetchDribbble(url: string): Promise<FetchedMetrics> {
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
      // 静默走快照
    }
  }
  return snapshot('Dribbble')
}

// —— 入口 ——

export async function fetchPlatformMetrics(
  platform: string,
  url: string,
): Promise<FetchedMetrics> {
  try {
    if (platform === 'GitHub') {
      const username = url.match(/github\.com\/([^/?#]+)/i)?.[1]
      if (username) return await fetchGitHub(username)
      return snapshot('GitHub')
    }
    if (platform === 'Dribbble') return await fetchDribbble(url)
    if (platform === '花瓣网') return await fetchHuaban(url)
    return snapshot(platform)
  } catch {
    return snapshot(platform)
  }
}
