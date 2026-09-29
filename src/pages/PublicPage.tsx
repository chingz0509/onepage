import type { PageConfig } from '../types'
import { navigate } from '../router'
import { getPage } from '../store'
import { parsePageConfig, fallbackPageConfig } from '../validate'
import { decodeConfig, decodeJson } from '../shareCodec'
import { TemplateRenderer } from '../components/TemplateRenderer'
import type { OnePageShare } from '../onepage'
import { OnePageShared } from './OnePageShared'

/**
 * /p/:slug 发布页。数据解析优先级：
 * 1. URL 的 ?d= 参数是 One Page 分享数据（kind: 'onepage'）→ Linktree 风格独立页
 * 2. URL 的 ?d= 参数是旧版 PageConfig（deflate + base64url，随链接传播）
 * 3. localStorage（兼容本机旧链接）
 * 都失败 → not found。校验不过 → 回退默认模板，保证脏数据也渲染得出页面。
 */
export function PublicPage({ slug, encoded }: { slug: string; encoded: string | null }) {
  if (encoded) {
    const share = decodeJson<OnePageShare>(encoded)
    if (share && share.kind === 'onepage' && Array.isArray(share.links)) {
      return <OnePageShared data={share} />
    }
  }

  let config: PageConfig | null = null

  if (encoded) {
    const decoded = decodeConfig(encoded)
    config = decoded ? parsePageConfig(decoded) : null
  }

  if (!config) {
    const stored = getPage(slug)
    if (stored) config = parsePageConfig(stored) ?? fallbackPageConfig(slug)
  }

  if (!config) {
    return (
      <div className="notfound">
        <h1>404 · 页面不存在</h1>
        <p>这个「OnePage」链接不存在或已被删除。</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          回到首页
        </button>
      </div>
    )
  }

  return <TemplateRenderer config={config} />
}
