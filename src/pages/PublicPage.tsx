import type { PageConfig } from '../types'
import { navigate } from '../router'
import { getPage } from '../store'
import { parsePageConfig, fallbackPageConfig } from '../validate'
import { decodeConfig, decodeJson } from '../shareCodec'
import { TemplateRenderer } from '../components/TemplateRenderer'
import type { OnePageShare } from '../onepage'
import { OnePageShared } from './OnePageShared'
import { useEffect, useState } from 'react'
import { readPage } from '../pageRepository'

/**
 * /p/:slug 发布页。数据解析优先级：
 * 1. URL 的 ?d= 参数是 One Page 分享数据（kind: 'onepage'）→ Linktree 风格独立页
 * 2. URL 的 ?d= 参数是旧版 PageConfig（deflate + base64url，随链接传播）
 * 3. localStorage（兼容本机旧链接）
 * 都失败 → not found。校验不过 → 回退默认模板，保证脏数据也渲染得出页面。
 */
export function PublicPage({ slug, encoded }: { slug: string; encoded: string | null }) {
  const [cloud, setCloud] = useState<{ slug: string; data: OnePageShare | null; error: boolean } | null>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (encoded) return
    let cancelled = false
    setCloud(null)
    readPage(slug).then((data) => { if (!cancelled) setCloud({ slug, data, error: false }) })
      .catch(() => { if (!cancelled) setCloud({ slug, data: null, error: true }) })
    return () => { cancelled = true }
  }, [slug, encoded, retry])
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
    if (!encoded && (!cloud || cloud.slug !== slug)) return <div className="notfound" role="status">正在加载页面…</div>
    if (!encoded && cloud?.error) return <div className="notfound"><p>暂时无法加载，请稍后重试</p><button className="btn btn-primary" onClick={() => setRetry((n) => n + 1)}>重试</button></div>
    if (!encoded && cloud?.data) return <OnePageShared data={cloud.data} />
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
