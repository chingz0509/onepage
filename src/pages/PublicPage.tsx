import type { PageConfig } from '../types'
import { navigate } from '../router'
import { getPage } from '../store'
import { parsePageConfig, fallbackPageConfig } from '../validate'
import { decodeConfig } from '../shareCodec'
import { TemplateRenderer } from '../components/TemplateRenderer'

/**
 * /p/:slug 发布页。数据解析优先级：
 * 1. URL 的 ?d= 参数（deflate + base64url 编码的完整 PageConfig，随链接传播）
 * 2. localStorage（兼容本机旧链接）
 * 都失败 → not found。校验不过 → 回退默认模板，保证脏数据也渲染得出页面。
 */
export function PublicPage({ slug, encoded }: { slug: string; encoded: string | null }) {
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
        <p>这个「一页」链接不存在或已被删除。</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          回到首页
        </button>
      </div>
    )
  }

  return <TemplateRenderer config={config} />
}
