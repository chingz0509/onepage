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
  /** 数据来源：live 实时获取；snapshot 仅存在于旧版分享链接（已停止产生） */
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
  /** 用户上传并压缩后的头像，随分享数据传递。 */
  avatarImage?: string
  wallpaper: string
  buttonStyle: ButtonStyleId
  buttonColor: ButtonColorId
  links: OnePageLink[]
}

export type Wallpaper = {
  id: string
  name: string
  /** solid 为颜色值，gradient 为 CSS 渐变；都直接用作 background */
  type: 'solid' | 'gradient' | 'photo'
  bg: string
  /** Flat color used for editor surfaces and contrast calculations on photo themes. */
  canvas?: string
  /** 页面文字色 */
  text: string
  /** 「跟随壁纸」时的按钮底色 */
  followBtn: string
  /** 「跟随壁纸」时的按钮文字色 */
  followText: string
  dark: boolean
}

/**
 * 选择器里展示的色板：低饱和莫兰迪色系 + 沉稳深色 + 含蓄渐变。
 * cream 保持为默认值（编辑版式模板绑定 cream）。
 */
export const WALLPAPERS: Wallpaper[] = [
  { id: 'template-water', name: '海边度假', type: 'photo', bg: 'linear-gradient(180deg, rgba(10,46,53,.48), rgba(10,46,53,.16)), url("/onepage-design/templates/water.jpg") center / cover #234b50', canvas: '#234b50', text: '#ffffff', followBtn: '#ffffff', followText: '#243c40', dark: true },
  { id: 'template-concrete', name: '城市建筑', type: 'photo', bg: 'linear-gradient(180deg, rgba(22,24,27,.6), rgba(22,24,27,.3)), url("/onepage-design/templates/concrete.jpg") center / cover #373b40', canvas: '#373b40', text: '#ffffff', followBtn: '#f6f4ef', followText: '#262b30', dark: true },
  { id: 'cream', name: '米白', type: 'solid', bg: '#FFF8EB', text: '#15161F', followBtn: '#F7F0DE', followText: '#15161F', dark: false },
  { id: 'oatmeal', name: '燕麦', type: 'solid', bg: '#EAE3D3', text: '#2C2721', followBtn: '#DBD2BC', followText: '#2C2721', dark: false },
  { id: 'smoke-pink', name: '烟粉', type: 'solid', bg: '#E6CDC5', text: '#4B3833', followBtn: '#D8B8AE', followText: '#4B3833', dark: false },
  { id: 'haze-blue', name: '雾霾蓝', type: 'solid', bg: '#BCC9D4', text: '#2C3844', followBtn: '#A9B8C6', followText: '#2C3844', dark: false },
  { id: 'sage', name: '灰豆绿', type: 'solid', bg: '#C2CBB9', text: '#333D30', followBtn: '#AFBAA4', followText: '#333D30', dark: false },
  { id: 'taro', name: '香芋紫', type: 'solid', bg: '#C9BFCB', text: '#3D3642', followBtn: '#B7ACBA', followText: '#3D3642', dark: false },
  { id: 'khaki', name: '卡其', type: 'solid', bg: '#D8CFB8', text: '#3C3526', followBtn: '#C7BC9F', followText: '#3C3526', dark: false },
  { id: 'charcoal', name: '炭灰', type: 'solid', bg: '#33312E', text: '#E9E5DD', followBtn: '#45423E', followText: '#E9E5DD', dark: true },
  { id: 'ink', name: '墨蓝', type: 'solid', bg: '#2A3442', text: '#DAE1EA', followBtn: '#3A4656', followText: '#DAE1EA', dark: true },
  { id: 'pine', name: '松烟绿', type: 'solid', bg: '#2F3D34', text: '#DFE7DC', followBtn: '#3F5044', followText: '#DFE7DC', dark: true },
  { id: 'coffee', name: '深焙咖啡', type: 'solid', bg: '#3E322B', text: '#E7DCD2', followBtn: '#4F4239', followText: '#E7DCD2', dark: true },
  { id: 'black', name: '纯黑', type: 'solid', bg: '#101010', text: '#ececec', followBtn: '#262626', followText: '#ececec', dark: true },
  { id: 'mist', name: '雾山蓝', type: 'gradient', bg: 'linear-gradient(160deg, #93A5B8 0%, #5E6E82 100%)', text: '#F0F3F6', followBtn: 'rgba(255,255,255,0.18)', followText: '#ffffff', dark: true },
  { id: 'dusk-rose', name: '暮色玫瑰', type: 'gradient', bg: 'linear-gradient(155deg, #C49A9C 0%, #7E5F6B 100%)', text: '#FBF3F1', followBtn: 'rgba(255,255,255,0.2)', followText: '#ffffff', dark: true },
]

export const PAGE_TEMPLATES: { wallpaper: string; name: string; description: string; buttonStyle: ButtonStyleId }[] = [
  { wallpaper: 'template-water', name: '海边度假', description: '水光背景 · 清爽白色', buttonStyle: 'pill' },
  { wallpaper: 'template-concrete', name: '城市建筑', description: '建筑光影 · 利落圆角', buttonStyle: 'round' },
  { wallpaper: 'pine', name: '深色自然', description: '松烟绿调 · 柔和层次', buttonStyle: 'round' },
]

/** 旧版色板：不再展示，仅用于兼容已发布分享链接里的旧壁纸 id */
const LEGACY_WALLPAPERS: Wallpaper[] = [
  { id: 'gray', name: '浅灰', type: 'solid', bg: '#eef0f3', text: '#23262c', followBtn: '#dcdfe6', followText: '#23262c', dark: false },
  { id: 'blue', name: '浅蓝', type: 'solid', bg: '#e1ecfb', text: '#1d2b45', followBtn: '#c4d7f5', followText: '#1d2b45', dark: false },
  { id: 'pink', name: '浅粉', type: 'solid', bg: '#fbe7ee', text: '#3d2330', followBtn: '#f4cfdc', followText: '#3d2330', dark: false },
  { id: 'yellow', name: '鹅黄', type: 'solid', bg: '#fdf2d3', text: '#3d3320', followBtn: '#f5e2ae', followText: '#3d3320', dark: false },
  { id: 'mint', name: '薄荷绿', type: 'solid', bg: '#e0f4ea', text: '#17352a', followBtn: '#c3e7d5', followText: '#17352a', dark: false },
  { id: 'brown', name: '深棕', type: 'solid', bg: '#3a2d27', text: '#f0e6de', followBtn: '#4d3d34', followText: '#f0e6de', dark: true },
  { id: 'navy', name: '深蓝', type: 'solid', bg: '#16213c', text: '#dfe7f5', followBtn: '#253359', followText: '#dfe7f5', dark: true },
  { id: 'wine', name: '酒红', type: 'solid', bg: '#571c2a', text: '#f5e2e6', followBtn: '#6e2839', followText: '#f5e2e6', dark: true },
  { id: 'aurora', name: '紫蓝极光', type: 'gradient', bg: 'linear-gradient(160deg, #667eea 0%, #764ba2 100%)', text: '#f2f0ff', followBtn: 'rgba(255,255,255,0.18)', followText: '#ffffff', dark: true },
  { id: 'sunset', name: '粉橙日落', type: 'gradient', bg: 'linear-gradient(155deg, #fda085 0%, #f76d8d 100%)', text: '#fff5f2', followBtn: 'rgba(255,255,255,0.2)', followText: '#ffffff', dark: true },
  { id: 'lagoon', name: '青绿极光', type: 'gradient', bg: 'linear-gradient(155deg, #0ba360 0%, #3cba92 100%)', text: '#effff8', followBtn: 'rgba(255,255,255,0.18)', followText: '#ffffff', dark: true },
  { id: 'night', name: '深蓝夜幕', type: 'gradient', bg: 'linear-gradient(160deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', text: '#e4eef4', followBtn: 'rgba(255,255,255,0.12)', followText: '#ffffff', dark: true },
]

const CUSTOM_PREFIX = 'custom:'

/** 自定义壁纸 id：`custom:rrggbb`，随分享链接一起编码传播 */
export function customWallpaperId(hex: string): string {
  return CUSTOM_PREFIX + hex.replace('#', '').toLowerCase()
}

export function isCustomWallpaperId(id: string): boolean {
  return /^custom:[0-9a-fA-F]{6}$/.test(id)
}

/** 由任意颜色推导完整壁纸定义：文字色/跟随按钮色按背景亮度自动取值 */
function customWallpaper(hex: string): Wallpaper {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const dark = luminance < 0.55
  const shade = (f: number) =>
    `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v * f))).toString(16).padStart(2, '0')).join('')}`
  return {
    id: customWallpaperId(hex),
    name: '自定义',
    type: 'solid',
    bg: `#${hex}`,
    text: dark ? '#F2EFE8' : '#242019',
    followBtn: dark ? shade(1.22) : shade(0.9),
    followText: dark ? '#F2EFE8' : '#242019',
    dark,
  }
}

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
  if (isCustomWallpaperId(id)) return customWallpaper(id.slice(CUSTOM_PREFIX.length))
  return (
    WALLPAPERS.find((w) => w.id === id) ??
    LEGACY_WALLPAPERS.find((w) => w.id === id) ??
    WALLPAPERS.find((w) => w.id === 'cream')!
  )
}
