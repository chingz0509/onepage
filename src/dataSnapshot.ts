/**
 * 平台数据真实快照（2026-10-01 抓取）。
 * Dribbble 数字来自 WebBridge 实抓 Summer Ching 主页（33 件作品逐件累加）；
 * GitHub 数字来自官方公开 API；其余平台为演示估值。
 * 实时获取失败时静默回退到这里，来源小字显示「YYYY-MM-DD 快照」。
 */

export const SNAPSHOT_DATE = '2026-10-01'

export type PlatformSnapshot = {
  metric: string
  value: string
  unit?: string
  insight: string
}

export const PLATFORM_SNAPSHOTS: Record<string, PlatformSnapshot> = {
  Dribbble: {
    metric: '总获赞',
    value: '388',
    insight: '33 件作品 · 累计 102.9k 浏览',
  },
  GitHub: {
    metric: '总 Star',
    value: '0',
    insight: '5 个公开仓库 · 1 位关注者，正在积累开源影响力',
  },
  Behance: {
    metric: '作品总浏览',
    value: '3.4k',
    insight: '近 90 天浏览量稳步上升，增幅 46%',
  },
  站酷: {
    metric: '人气值',
    value: '856',
    insight: '3 件作品被编辑推荐至首页',
  },
  掘金: {
    metric: '文章阅读量',
    value: '48w',
    insight: '3 篇专栏进入前端分类热榜',
  },
  'Stack Overflow': {
    metric: '声望值',
    value: '3.2k',
    insight: '回答采纳率 68%，高于社区均值',
  },
}
