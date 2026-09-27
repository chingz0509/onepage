import type { PageConfig } from './types'

/**
 * 存储层抽象 —— 调用方只允许通过这三个函数读写页面配置，
 * 禁止直接触碰 localStorage。
 *
 * Week 2 迁移 serverless + KV 时：保持签名不变，
 * 函数体换成 fetch 调用即可（返回值可演进为 Promise，
 * 建议届时一次性把签名改为 async）。
 */

const STORAGE_KEY = 'yiye.pages.v1'

const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function generateSlug(length = 6): string {
  let slug = ''
  for (let i = 0; i < length; i++) {
    slug += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)]
  }
  return slug
}

function readAll(): Record<string, PageConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, PageConfig>)
      : {}
  } catch {
    return {}
  }
}

function writeAll(pages: Record<string, PageConfig>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages))
}

/** 保存页面配置；config.slug 为空时自动生成 6 位随机 slug。返回落库后的完整配置。 */
export function savePage(config: Omit<PageConfig, 'slug'> & { slug?: string }): PageConfig {
  const pages = readAll()
  let slug = config.slug
  if (!slug || pages[slug]) {
    do {
      slug = generateSlug()
    } while (pages[slug])
  }
  const saved: PageConfig = { ...config, slug }
  pages[slug] = saved
  writeAll(pages)
  return saved
}

/** 按 slug 读取页面配置，不存在返回 null */
export function getPage(slug: string): PageConfig | null {
  return readAll()[slug] ?? null
}

/** 列出全部已发布页面 */
export function listPages(): PageConfig[] {
  return Object.values(readAll())
}
