/**
 * One Page（AI 版 Linktree）共享模型与主题表。
 * OnePagePreview（创建向导 + 主页管理）与 OnePageShared（独立分享页）共用。
 */

export type OnePageLink = {
  platform: string
  badge: string
  accent: string
  metric: string
  value: string
  unit?: string
  insight: string
  url: string
  /** 数据来源：live 实时获取 / snapshot 快照兜底；旧数据缺省按 live 展示 */
  source?: 'live' | 'snapshot'
  generic?: boolean
}

export type ButtonStyleId = 'square' | 'round' | 'pill'
export type ButtonColorId = 'black' | 'white' | 'blue' | 'wallpaper'

/** 经 shareCodec 编码进分享链接的页面数据 */
export type OnePageShare = {
  kind: 'onepage'
  slug: string
  name: string
  title: string
  bio: string
  /** 头像单字 */
  avatar: string
  wallpaper: string
  buttonStyle: ButtonStyleId
  buttonColor: ButtonColorId
  links: OnePageLink[]
}

export type Wallpaper = {
  id: string
  name: string
  /** solid 为颜色值，gradient 为 CSS 渐变；都直接用作 background */
  type: 'solid' | 'gradient'
  bg: string
  /** 页面文字色 */
  text: string
  /** 「跟随壁纸」时的按钮底色 */
  followBtn: string
  /** 「跟随壁纸」时的按钮文字色 */
  followText: string
  dark: boolean
}

export const WALLPAPERS: Wallpaper[] = [
  { id: 'cream', name: '米白', type: 'solid', bg: '#F1ECDE', text: '#1A1A18', followBtn: '#E6DCC4', followText: '#1A1A18', dark: false },
  { id: 'gray', name: '浅灰', type: 'solid', bg: '#eef0f3', text: '#23262c', followBtn: '#dcdfe6', followText: '#23262c', dark: false },
  { id: 'blue', name: '浅蓝', type: 'solid', bg: '#e1ecfb', text: '#1d2b45', followBtn: '#c4d7f5', followText: '#1d2b45', dark: false },
  { id: 'pink', name: '浅粉', type: 'solid', bg: '#fbe7ee', text: '#3d2330', followBtn: '#f4cfdc', followText: '#3d2330', dark: false },
  { id: 'yellow', name: '鹅黄', type: 'solid', bg: '#fdf2d3', text: '#3d3320', followBtn: '#f5e2ae', followText: '#3d3320', dark: false },
  { id: 'mint', name: '薄荷绿', type: 'solid', bg: '#e0f4ea', text: '#17352a', followBtn: '#c3e7d5', followText: '#17352a', dark: false },
  { id: 'brown', name: '深棕', type: 'solid', bg: '#3a2d27', text: '#f0e6de', followBtn: '#4d3d34', followText: '#f0e6de', dark: true },
  { id: 'navy', name: '深蓝', type: 'solid', bg: '#16213c', text: '#dfe7f5', followBtn: '#253359', followText: '#dfe7f5', dark: true },
  { id: 'wine', name: '酒红', type: 'solid', bg: '#571c2a', text: '#f5e2e6', followBtn: '#6e2839', followText: '#f5e2e6', dark: true },
  { id: 'black', name: '纯黑', type: 'solid', bg: '#101010', text: '#ececec', followBtn: '#262626', followText: '#ececec', dark: true },
  { id: 'aurora', name: '紫蓝极光', type: 'gradient', bg: 'linear-gradient(160deg, #667eea 0%, #764ba2 100%)', text: '#f2f0ff', followBtn: 'rgba(255,255,255,0.18)', followText: '#ffffff', dark: true },
  { id: 'sunset', name: '粉橙日落', type: 'gradient', bg: 'linear-gradient(155deg, #fda085 0%, #f76d8d 100%)', text: '#fff5f2', followBtn: 'rgba(255,255,255,0.2)', followText: '#ffffff', dark: true },
  { id: 'lagoon', name: '青绿极光', type: 'gradient', bg: 'linear-gradient(155deg, #0ba360 0%, #3cba92 100%)', text: '#effff8', followBtn: 'rgba(255,255,255,0.18)', followText: '#ffffff', dark: true },
  { id: 'night', name: '深蓝夜幕', type: 'gradient', bg: 'linear-gradient(160deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', text: '#e4eef4', followBtn: 'rgba(255,255,255,0.12)', followText: '#ffffff', dark: true },
]

export const BUTTON_STYLES: { id: ButtonStyleId; name: string; radius: string }[] = [
  { id: 'square', name: '直角专业', radius: '4px' },
  { id: 'round', name: '圆角友好', radius: '12px' },
  { id: 'pill', name: '胶囊现代', radius: '999px' },
]

export const BUTTON_COLORS: { id: ButtonColorId; name: string }[] = [
  { id: 'black', name: '黑色' },
  { id: 'white', name: '白色' },
  { id: 'blue', name: '品牌蓝' },
  { id: 'wallpaper', name: '跟随壁纸' },
]

export function resolveButtonColors(
  wallpaper: Wallpaper,
  color: ButtonColorId,
): { bg: string; text: string; border: string } {
  switch (color) {
    case 'black':
      return { bg: '#17203a', text: '#ffffff', border: 'transparent' }
    case 'white':
      return { bg: '#ffffff', text: '#17203a', border: 'rgba(23, 32, 58, 0.12)' }
    case 'blue':
      return { bg: '#0a6cff', text: '#ffffff', border: 'transparent' }
    case 'wallpaper':
      return { bg: wallpaper.followBtn, text: wallpaper.followText, border: 'transparent' }
  }
}

export function wallpaperById(id: string): Wallpaper {
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0]
}
