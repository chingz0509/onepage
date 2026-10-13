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
  /** Public URL of a captured first-screen website preview. */
  previewImage?: string
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
  /** Optional edge for translucent template buttons. */
  followBorder?: string
  dark: boolean
  /** Typography and paper edges belong to the template, not the editor UI. */
  fontFamily?: string
  paperEdge?: boolean
}

/** Curated solid editions; legacy colors remain resolvable for existing pages. */
export const CLASSIC_WALLPAPERS: Wallpaper[] = [
  { id: 'custom:ffffff', name: '纯白', type: 'solid', bg: '#FFFFFF', text: '#242629', followBtn: '#F1F2F3', followText: '#242629', dark: false },
  { id: 'classic-ivory', name: '象牙白', type: 'solid', bg: '#F5F1E8', text: '#38332B', followBtn: '#E7DFD1', followText: '#38332B', dark: false },
  { id: 'classic-fog', name: '雾灰', type: 'solid', bg: '#E6E9EC', text: '#28313B', followBtn: '#D5DCE1', followText: '#28313B', dark: false },
  { id: 'classic-sage', name: '鼠尾草绿', type: 'solid', bg: '#DCE4D8', text: '#304234', followBtn: '#C7D3C0', followText: '#304234', dark: false },
  { id: 'classic-navy', name: '午夜蓝', type: 'solid', bg: '#172B46', text: '#F3F0E9', followBtn: '#2F4663', followText: '#F3F0E9', dark: true },
  { id: 'classic-burgundy', name: '勃艮第红', type: 'solid', bg: '#562B38', text: '#FFF3E9', followBtn: '#71404E', followText: '#FFF3E9', dark: true },
  { id: 'classic-clay', name: '陶土', type: 'solid', bg: '#C9AA97', text: '#3D2D24', followBtn: '#EEDCCB', followText: '#3D2D24', dark: false },
  { id: 'classic-ink', name: '墨黑', type: 'solid', bg: '#202124', text: '#F3F1EA', followBtn: '#37393D', followText: '#F3F1EA', dark: true },
]

/**
 * 选择器里展示的色板：低饱和莫兰迪色系 + 沉稳深色 + 含蓄渐变。
 * cream 保持为默认值（编辑版式模板绑定 cream）。
 */
export const WALLPAPERS: Wallpaper[] = [
  ...CLASSIC_WALLPAPERS,
  { id: 'premium-track', name: '蓝色起跑', type: 'photo', bg: 'linear-gradient(180deg, rgba(0,38,78,.15), transparent), url("/onepage-design/templates/premium-track.webp?v=20261013-personality-ready") center / cover #086dae', canvas: '#086dae', text: '#ffffff', followBtn: '#ffffff', followText: '#153345', dark: true, paperEdge: true },
  { id: 'premium-bakery', name: '黄油来信', type: 'photo', bg: 'linear-gradient(180deg, rgba(255,248,234,.42), rgba(255,248,234,.12)), url("/onepage-design/templates/premium-bakery.webp?v=20261013-personality-ready") center / cover #ab8358', canvas: '#ab8358', text: '#603c28', followBtn: '#fffaf0', followText: '#9b301a', dark: false, fontFamily: 'Georgia, "Songti SC", serif', paperEdge: true },
  { id: 'premium-vanity', name: '金色妆台', type: 'photo', bg: 'linear-gradient(180deg, rgba(255,248,234,.22), transparent), url("/onepage-design/templates/premium-vanity.webp?v=20261013-personality-ready") center / cover #9e794b', canvas: '#9e794b', text: '#4b3320', followBtn: '#f1ddbc', followText: '#60482c', dark: false, fontFamily: 'Georgia, "Songti SC", serif' },
  { id: 'premium-film', name: '焦糖胶片', type: 'photo', bg: 'linear-gradient(180deg, rgba(0,0,0,.22), rgba(0,0,0,.03)), url("/onepage-design/templates/premium-film.webp?v=20261013-personality-ready") center / cover #8b5536', canvas: '#8b5536', text: '#fff0d7', followBtn: '#fff9ee', followText: '#835234', dark: true, fontFamily: '"Courier New", "PingFang SC", monospace' },
  { id: 'premium-celadon', name: '青瓷微雨', type: 'photo', bg: 'url("/onepage-design/templates/premium-celadon.webp?v=20261013") center / cover #c0cdb5', canvas: '#c0cdb5', text: '#293d30', followBtn: '#fcfdf7', followText: '#293d30', followBorder: 'rgba(255,255,255,.35)', dark: false },
  { id: 'premium-water', name: '碧波留光', type: 'photo', bg: 'url("/onepage-design/templates/premium-water.webp?v=20261013") center / cover #86b9b5', canvas: '#86b9b5', text: '#173f42', followBtn: '#f4faf7', followText: '#173f42', followBorder: 'rgba(255,255,255,.35)', dark: false },
  { id: 'premium-architecture', name: '石光拱廊', type: 'photo', bg: 'url("/onepage-design/templates/premium-architecture.webp?v=20261013") center / cover #e6d9c6', canvas: '#e6d9c6', text: '#3f352b', followBtn: '#fffaf0', followText: '#3f352b', followBorder: 'rgba(255,255,255,.35)', dark: false },
  { id: 'premium-forest', name: '雾林深处', type: 'photo', bg: 'linear-gradient(180deg, rgba(10,31,21,.5), rgba(10,31,21,.14)), url("/onepage-design/templates/premium-forest.webp?v=20261013") center / cover #243c32', canvas: '#243c32', text: '#f2f6eb', followBtn: '#edf3e7', followText: '#273e31', followBorder: 'rgba(255,255,255,.35)', dark: true },
  { id: 'premium-coast', name: '暮海玫瑰', type: 'photo', bg: 'url("/onepage-design/templates/premium-coast.webp?v=20261013") center / cover #b49b9e', canvas: '#b49b9e', text: '#2e2128', followBtn: '#faf1ee', followText: '#48343e', followBorder: 'rgba(255,255,255,.35)', dark: false },
  { id: 'premium-botanical', name: '暖杏花影', type: 'photo', bg: 'url("/onepage-design/templates/premium-botanical.webp?v=20261013") center / cover #ead8bc', canvas: '#ead8bc', text: '#4c3b28', followBtn: '#fffaf0', followText: '#4c3b28', followBorder: 'rgba(255,255,255,.35)', dark: false },
  { id: 'template-water', name: '海边度假', type: 'photo', bg: 'linear-gradient(180deg, rgba(15,64,69,.28), rgba(15,64,69,.14)), url("/onepage-design/templates/water-serene-v2.jpg") center / cover #2b777a', canvas: '#2b777a', text: '#f4faf7', followBtn: 'rgba(13, 65, 70, .46)', followText: '#f4faf7', followBorder: 'rgba(231,249,243,.28)', dark: true },
  { id: 'template-concrete', name: '城市建筑', type: 'photo', bg: 'linear-gradient(180deg, rgba(247,242,232,.12), rgba(247,242,232,.04)), url("/onepage-design/templates/city-arch-v2.jpg") center / cover #e2d8c7', canvas: '#e2d8c7', text: '#352e26', followBtn: 'rgba(251,247,238,.58)', followText: '#352e26', followBorder: 'rgba(108,87,62,.2)', dark: false },
  { id: 'template-forest', name: '深色自然', type: 'photo', bg: 'linear-gradient(180deg, rgba(18,37,29,.12), rgba(18,37,29,.24)), url("/onepage-design/templates/forest-mist.jpg") center / cover #253e34', canvas: '#253e34', text: '#eff4e9', followBtn: 'rgba(213,230,207,.16)', followText: '#eff4e9', dark: true },
  { id: 'template-coast', name: '暮色海岸', type: 'photo', bg: 'linear-gradient(180deg, rgba(64,38,47,.3), rgba(64,38,47,.16)), url("/onepage-design/templates/coast-dusk.jpg") center / cover #705055', canvas: '#705055', text: '#fff4ee', followBtn: 'rgba(74,45,56,.46)', followText: '#fff4ee', followBorder: 'rgba(255,232,219,.28)', dark: true },
  { id: 'template-mountain', name: '雾蓝山野', type: 'photo', bg: 'linear-gradient(180deg, rgba(235,241,244,.12), rgba(235,241,244,.06)), url("/onepage-design/templates/mountain-mist.jpg") center / cover #a8b9c4', canvas: '#a8b9c4', text: '#263b4d', followBtn: 'rgba(238,246,249,.56)', followText: '#263b4d', followBorder: 'rgba(62,87,109,.22)', dark: false },
  { id: 'template-apricot', name: '暖杏花影', type: 'photo', bg: 'linear-gradient(180deg, rgba(250,242,229,.08), rgba(250,242,229,.04)), url("/onepage-design/templates/apricot-botanical.jpg") center / cover #e6cfb4', canvas: '#e6cfb4', text: '#483527', followBtn: 'rgba(255,248,234,.56)', followText: '#483527', followBorder: 'rgba(132,93,60,.2)', dark: false },
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
  { wallpaper: 'premium-celadon', name: '青瓷微雨', description: '青瓷釉纹 · 柔光颗粒', buttonStyle: 'pill' },
  { wallpaper: 'premium-track', name: '蓝色起跑', description: '塑胶跑道 · 纸边节奏', buttonStyle: 'square' },
  { wallpaper: 'premium-water', name: '碧波留光', description: '水纹折光 · 通透青绿', buttonStyle: 'pill' },
  { wallpaper: 'premium-architecture', name: '石光拱廊', description: '石材肌理 · 温柔光影', buttonStyle: 'round' },
  { wallpaper: 'premium-forest', name: '雾林深处', description: '蕨叶雾气 · 深绿静谧', buttonStyle: 'round' },
  { wallpaper: 'premium-coast', name: '暮海玫瑰', description: '海面微光 · 玫瑰暮色', buttonStyle: 'pill' },
  { wallpaper: 'premium-botanical', name: '暖杏花影', description: '纸纤花影 · 暖杏微光', buttonStyle: 'pill' },
  { wallpaper: 'premium-bakery', name: '黄油来信', description: '烘焙晨光 · 奶油纸边', buttonStyle: 'square' },
  { wallpaper: 'premium-vanity', name: '金色妆台', description: '暖金光影 · 丝绒柔感', buttonStyle: 'pill' },
  { wallpaper: 'premium-film', name: '焦糖胶片', description: '复古颗粒 · 打字机体', buttonStyle: 'pill' },
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

/** Keep template samples, editor previews and shared pages on the same button shape. */
export function resolveButtonShape(wallpaper: Wallpaper, style: ButtonStyleId) {
  return {
    borderRadius: BUTTON_STYLES.find((button) => button.id === style)?.radius ?? '999px',
    clipPath: wallpaper.paperEdge && style === 'square' ? PAPER_EDGE : undefined,
  }
}

const PAPER_EDGE = 'polygon(0% 4.00%, 1% 3.62%, 2% 2.62%, 3% 1.38%, 4% 0.38%, 5% 0.00%, 6% 0.38%, 7% 1.38%, 8% 2.62%, 9% 3.62%, 10% 4.00%, 11% 3.62%, 12% 2.62%, 13% 1.38%, 14% 0.38%, 15% 0.00%, 16% 0.38%, 17% 1.38%, 18% 2.62%, 19% 3.62%, 20% 4.00%, 21% 3.62%, 22% 2.62%, 23% 1.38%, 24% 0.38%, 25% 0.00%, 26% 0.38%, 27% 1.38%, 28% 2.62%, 29% 3.62%, 30% 4.00%, 31% 3.62%, 32% 2.62%, 33% 1.38%, 34% 0.38%, 35% 0.00%, 36% 0.38%, 37% 1.38%, 38% 2.62%, 39% 3.62%, 40% 4.00%, 41% 3.62%, 42% 2.62%, 43% 1.38%, 44% 0.38%, 45% 0.00%, 46% 0.38%, 47% 1.38%, 48% 2.62%, 49% 3.62%, 50% 4.00%, 51% 3.62%, 52% 2.62%, 53% 1.38%, 54% 0.38%, 55% 0.00%, 56% 0.38%, 57% 1.38%, 58% 2.62%, 59% 3.62%, 60% 4.00%, 61% 3.62%, 62% 2.62%, 63% 1.38%, 64% 0.38%, 65% 0.00%, 66% 0.38%, 67% 1.38%, 68% 2.62%, 69% 3.62%, 70% 4.00%, 71% 3.62%, 72% 2.62%, 73% 1.38%, 74% 0.38%, 75% 0.00%, 76% 0.38%, 77% 1.38%, 78% 2.62%, 79% 3.62%, 80% 4.00%, 81% 3.62%, 82% 2.62%, 83% 1.38%, 84% 0.38%, 85% 0.00%, 86% 0.38%, 87% 1.38%, 88% 2.62%, 89% 3.62%, 90% 4.00%, 91% 3.62%, 92% 2.62%, 93% 1.38%, 94% 0.38%, 95% 0.00%, 96% 0.38%, 97% 1.38%, 98% 2.62%, 99% 3.62%, 100% 4.00%, 100% 96.00%, 99% 96.38%, 98% 97.38%, 97% 98.62%, 96% 99.62%, 95% 100.00%, 94% 99.62%, 93% 98.62%, 92% 97.38%, 91% 96.38%, 90% 96.00%, 89% 96.38%, 88% 97.38%, 87% 98.62%, 86% 99.62%, 85% 100.00%, 84% 99.62%, 83% 98.62%, 82% 97.38%, 81% 96.38%, 80% 96.00%, 79% 96.38%, 78% 97.38%, 77% 98.62%, 76% 99.62%, 75% 100.00%, 74% 99.62%, 73% 98.62%, 72% 97.38%, 71% 96.38%, 70% 96.00%, 69% 96.38%, 68% 97.38%, 67% 98.62%, 66% 99.62%, 65% 100.00%, 64% 99.62%, 63% 98.62%, 62% 97.38%, 61% 96.38%, 60% 96.00%, 59% 96.38%, 58% 97.38%, 57% 98.62%, 56% 99.62%, 55% 100.00%, 54% 99.62%, 53% 98.62%, 52% 97.38%, 51% 96.38%, 50% 96.00%, 49% 96.38%, 48% 97.38%, 47% 98.62%, 46% 99.62%, 45% 100.00%, 44% 99.62%, 43% 98.62%, 42% 97.38%, 41% 96.38%, 40% 96.00%, 39% 96.38%, 38% 97.38%, 37% 98.62%, 36% 99.62%, 35% 100.00%, 34% 99.62%, 33% 98.62%, 32% 97.38%, 31% 96.38%, 30% 96.00%, 29% 96.38%, 28% 97.38%, 27% 98.62%, 26% 99.62%, 25% 100.00%, 24% 99.62%, 23% 98.62%, 22% 97.38%, 21% 96.38%, 20% 96.00%, 19% 96.38%, 18% 97.38%, 17% 98.62%, 16% 99.62%, 15% 100.00%, 14% 99.62%, 13% 98.62%, 12% 97.38%, 11% 96.38%, 10% 96.00%, 9% 96.38%, 8% 97.38%, 7% 98.62%, 6% 99.62%, 5% 100.00%, 4% 99.62%, 3% 98.62%, 2% 97.38%, 1% 96.38%, 0% 96.00%)'

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
      return { bg: wallpaper.followBtn, text: wallpaper.followText, border: wallpaper.followBorder ?? 'transparent' }
  }
}

export function wallpaperById(id: string): Wallpaper {
  const classic = CLASSIC_WALLPAPERS.find((wallpaper) => wallpaper.id === id)
  if (classic) return classic
  if (isCustomWallpaperId(id)) return customWallpaper(id.slice(CUSTOM_PREFIX.length))
  return (
    WALLPAPERS.find((w) => w.id === id) ??
    LEGACY_WALLPAPERS.find((w) => w.id === id) ??
    WALLPAPERS.find((w) => w.id === 'cream')!
  )
}
