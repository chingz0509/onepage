import type { ModuleConfig, Profile } from './types'

/**
 * 3 个虚构 demo 人设，数据写死。
 * ⚡ Week 2 AI 接入点 #2：「粘贴资料 → AI 抽取结构化 profile/modules」
 * 会产出与 PersonaDraft 相同形状的数据，向导第一步无需改动。
 */

export interface PersonaDraft {
  id: string
  label: string
  tagline: string
  profile: Profile
  /** 覆盖模板默认模块的 data（显隐与顺序仍取模板 defaultModules） */
  moduleData: Partial<Record<ModuleConfig['type'], Record<string, unknown>>>
}

/** 生成离线可用的 SVG 占位头像（首字 + 渐变底） */
export function placeholderAvatar(initial: string, from: string, to: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="192" height="192" fill="url(#g)"/>` +
    `<text x="96" y="118" font-size="72" font-family="sans-serif" ` +
    `fill="rgba(255,255,255,0.95)" text-anchor="middle">${initial}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export const PERSONAS: PersonaDraft[] = [
  {
    id: 'designer',
    label: 'UI 设计师',
    tagline: '林小满 · 资深 UI 设计师 @ 星海科技',
    profile: {
      name: '林小满',
      title: '资深 UI 设计师',
      company: '星海科技',
      bio: '相信好的设计是隐形的。7 年移动端设计经验，做过 3 款千万级 DAU 产品。',
      avatarUrl: placeholderAvatar('满', '#ff6ec7', '#7b61ff'),
    },
    moduleData: {
      status: { mode: 'open' },
      contacts: {
        items: [
          { type: 'maimai', value: 'maimai.cn/linxiaoman' },
          { type: 'wechat', value: 'xiaoman_design' },
          { type: 'email', value: 'xiaoman@example.com' },
        ],
      },
      experience: {
        items: [
          {
            company: '星海科技',
            title: '资深 UI 设计师',
            period: '2021 - 至今',
            description: '主导旗舰 App 5.0 改版，设计语言系统负责人。',
          },
          {
            company: '云间网络',
            title: 'UI 设计师',
            period: '2018 - 2021',
            description: '负责电商产品线全链路视觉与交互设计。',
          },
        ],
      },
      skills: {
        items: ['视觉设计', '设计系统', 'Figma', '动效设计', '用户研究', 'A/B 测试'],
      },
      works: {
        items: [
          {
            title: '星海 App 5.0 改版复盘',
            description: '从数据到设计语言：一次千万级产品的视觉重生',
            url: 'https://example.com/redesign-case',
          },
          {
            title: '个人作品集',
            description: '2018-2025 精选项目合集',
            url: 'https://example.com/portfolio',
          },
        ],
      },
    },
  },
  {
    id: 'engineer',
    label: '前端工程师',
    tagline: '陈一帆 · 高级前端工程师 @ 量子矩阵',
    profile: {
      name: '陈一帆',
      title: '高级前端工程师',
      company: '量子矩阵',
      bio: '专注前端工程化与性能优化，开源爱好者，周末写博客。',
      avatarUrl: placeholderAvatar('帆', '#3ee6c4', '#1f6feb'),
    },
    moduleData: {
      status: { mode: 'looking' },
      contacts: {
        items: [
          { type: 'maimai', value: 'maimai.cn/chenyifan' },
          { type: 'email', value: 'yifan.dev@example.com' },
          { type: 'phone', value: '138****0000' },
        ],
      },
      experience: {
        items: [
          {
            company: '量子矩阵',
            title: '高级前端工程师',
            period: '2022 - 至今',
            description: '负责中后台微前端架构，首屏性能提升 60%。',
          },
          {
            company: '飞驰网络',
            title: '前端工程师',
            period: '2019 - 2022',
            description: '从 0 搭建组件库与 CI 流水线。',
          },
        ],
      },
      skills: {
        items: ['React', 'TypeScript', 'Vite', 'Node.js', '性能优化', '微前端'],
      },
      works: {
        items: [
          {
            title: 'vite-plugin-fast-router',
            description: '开源插件，GitHub 1.2k star',
            url: 'https://example.com/vite-plugin',
          },
          {
            title: '技术博客',
            description: '前端性能优化系列文章',
            url: 'https://example.com/blog',
          },
        ],
      },
    },
  },
  {
    id: 'headhunter',
    label: '猎头顾问',
    tagline: '苏芮 · 互联网猎头顾问 @ 伯乐咨询',
    profile: {
      name: '苏芮',
      title: '互联网猎头顾问',
      company: '伯乐咨询',
      bio: '专注大厂技术岗与高潜创业公司，手上有 200+ 真实在招职位。',
      avatarUrl: placeholderAvatar('芮', '#0a6cff', '#66a3ff'),
    },
    moduleData: {
      status: { mode: 'busy' },
      contacts: {
        items: [
          { type: 'maimai', value: 'maimai.cn/surui' },
          { type: 'wechat', value: 'surui_hr' },
          { type: 'phone', value: '137****8888' },
        ],
      },
      experience: {
        items: [
          {
            company: '伯乐咨询',
            title: '资深猎头顾问',
            period: '2020 - 至今',
            description: '年均关闭 40+ offer，专注 P7+ 技术岗。',
          },
          {
            company: '锐仕方达',
            title: '猎头顾问',
            period: '2017 - 2020',
            description: '互联网团队核心成员，连续两年百万顾问。',
          },
        ],
      },
      skills: {
        items: ['人才Mapping', '薪酬谈判', '技术岗招聘', '职业规划', '行业洞察'],
      },
      works: {
        items: [
          {
            title: '2025 互联网技术岗薪酬报告',
            description: '联合 30 家大厂出品的年度薪酬指南',
            url: 'https://example.com/salary-report',
          },
        ],
      },
    },
  },
]
