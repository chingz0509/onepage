import type { ModuleConfig, PageConfig, Profile } from './types'
import { MODULE_TYPES } from './types'
import { DEFAULT_TEMPLATE_ID, getTemplate } from './templates'

/**
 * 页面配置 JSON 校验。
 * 渲染引擎的防御层：任何一步不通过，调用方回退默认模板生成的页面。
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isValidProfile(p: unknown): p is Profile {
  if (!isRecord(p)) return false
  return ['name', 'title', 'company', 'bio', 'avatarUrl'].every(
    (k) => typeof p[k] === 'string',
  )
}

function isValidModule(m: unknown): m is ModuleConfig {
  if (!isRecord(m)) return false
  return (
    typeof m.type === 'string' &&
    (MODULE_TYPES as readonly string[]).includes(m.type) &&
    typeof m.visible === 'boolean' &&
    typeof m.order === 'number' &&
    isRecord(m.data)
  )
}

export function validatePageConfig(raw: unknown): raw is PageConfig {
  if (!isRecord(raw)) return false
  return (
    typeof raw.slug === 'string' &&
    raw.slug.length > 0 &&
    typeof raw.templateId === 'string' &&
    isValidProfile(raw.profile) &&
    Array.isArray(raw.modules) &&
    raw.modules.every(isValidModule)
  )
}

/**
 * 解析任意输入（对象或 JSON 字符串）为 PageConfig。
 * 校验失败返回 null —— 由调用方决定回退策略。
 */
export function parsePageConfig(input: unknown): PageConfig | null {
  let raw = input
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input)
    } catch {
      return null
    }
  }
  return validatePageConfig(raw) ? (raw as PageConfig) : null
}

/** 校验失败时的回退：默认模板 + 空档案骨架 */
export function fallbackPageConfig(slug = 'invalid'): PageConfig {
  const template = getTemplate(DEFAULT_TEMPLATE_ID)
  return {
    slug,
    templateId: template.id,
    profile: {
      name: '职场人',
      title: '',
      company: '',
      bio: '这个人很神秘，什么都没留下。',
      avatarUrl: '',
    },
    modules: template.defaultModules.map((m) => ({ ...m })),
  }
}

export interface PastedDraft {
  profile: Profile
  moduleData: Record<string, Record<string, unknown>>
}

/**
 * 创建向导「粘贴自己的资料」的校验：
 * 接受 `{ profile, moduleData? }` 或直接粘贴 profile 本体。
 * ⚡ Week 2 AI 接入点 #2 的输出也走这个形状。
 */
export function validatePastedDraft(input: string): PastedDraft | null {
  try {
    const raw: unknown = JSON.parse(input)
    if (!isRecord(raw)) return null
    if (isValidProfile(raw.profile)) {
      const moduleData = isRecord(raw.moduleData) ? raw.moduleData : {}
      return { profile: raw.profile, moduleData: moduleData as PastedDraft['moduleData'] }
    }
    if (isValidProfile(raw)) return { profile: raw, moduleData: {} }
    return null
  } catch {
    return null
  }
}
