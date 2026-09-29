/**
 * 「OnePage」核心协议类型定义
 *
 * 两层 JSON：
 * 1. TemplateConfig —— 模板 JSON，描述视觉风格 + 默认模块编排
 * 2. PageConfig     —— 页面配置 JSON，渲染引擎的唯一输入
 */

// ---------- 模板 ----------

export type BackgroundType = 'solid' | 'gradient'

export interface ButtonStyle {
  /** 卡片/按钮圆角，CSS 值 */
  radius: string
  /** 卡片阴影，CSS box-shadow 值 */
  shadow: string
}

export interface TemplateStyle {
  /** 页面背景：solid 时为颜色值，gradient 时为 CSS gradient */
  background: string
  backgroundType: BackgroundType
  /** 卡片背景，支持 rgba 半透明（配 backdrop-filter 即为毛玻璃） */
  cardBg: string
  textColor: string
  accentColor: string
  fontFamily: string
  buttonStyle: ButtonStyle
}

export interface TemplateConfig {
  id: string
  name: string
  description: string
  /** 预览缩略图用色板（主色 2-4 个） */
  previewColors: string[]
  style: TemplateStyle
  /** 默认模块编排：新建页面时的初始 modules */
  defaultModules: ModuleConfig[]
}

// ---------- 页面 ----------

export const MODULE_TYPES = [
  'header',
  'contacts',
  'experience',
  'skills',
  'works',
  'status',
] as const

export type ModuleType = (typeof MODULE_TYPES)[number]

export interface ModuleConfig {
  type: ModuleType
  visible: boolean
  order: number
  /** 各模块自有数据结构，见 personas.ts 中的示例 */
  data: Record<string, unknown>
}

export interface Profile {
  name: string
  title: string
  company: string
  bio: string
  avatarUrl: string
}

export interface PageConfig {
  /** 6 位随机字母数字 */
  slug: string
  templateId: string
  /**
   * 受约束的样式覆盖：Week 1 只允许从模板预设色板里选 accentColor。
   * Week 2 主题编辑器可在此扩展，渲染引擎已按「模板 style 为底、overrides 覆盖」实现。
   */
  styleOverrides?: Partial<Pick<TemplateStyle, 'accentColor' | 'cardBg' | 'textColor'>>
  profile: Profile
  modules: ModuleConfig[]
}

// ---------- 模块 data 的具体形状（渲染引擎按此读取） ----------

export interface ContactItem {
  type: 'maimai' | 'wechat' | 'email' | 'phone'
  /** 展示值，如微信号 / 邮箱地址 */
  value: string
}

export interface ExperienceItem {
  company: string
  title: string
  period: string
  description: string
}

export interface WorkItem {
  title: string
  description: string
  url: string
  /** 缩略图，缺省时渲染占位块 */
  thumbnail?: string
}

export type StatusMode = 'looking' | 'open' | 'busy'

export interface StatusData {
  mode: StatusMode
  label?: string
}
