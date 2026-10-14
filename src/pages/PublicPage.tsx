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
import { DirectoryCreateLink } from '../components/DirectoryCreateLink'

export function PageStatus({ kind, onRetry }: { kind: 'loading' | 'error' | 'missing'; onRetry?: () => void }) {
  const loading = kind === 'loading'
  return <main className="op-status-page"><section className="op-status-card" role={loading ? 'status' : undefined} aria-busy={loading}>
    <span className="op-status-kicker">ONE PAGE</span>
    {loading ? <><div className="op-status-spinner" aria-hidden="true" /><p>正在打开个人目录…</p></> : <>
      <h1>{kind === 'error' ? '暂时无法打开' : '这一页暂时不在这里'}</h1>
      <p>{kind === 'error' ? '连接有些不稳定，稍后再试一下。' : '链接可能有误，或页面已被移除。'}</p>
      <button className="btn btn-primary" onClick={kind === 'error' ? onRetry : () => navigate('/')}>{kind === 'error' ? '重新加载' : '回到首页'}</button>
    </>}
  </section></main>
}

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
    if (!encoded && (!cloud || cloud.slug !== slug)) return <PageStatus kind="loading" />
    if (!encoded && cloud?.error) return <PageStatus kind="error" onRetry={() => setRetry((n) => n + 1)} />
    if (!encoded && cloud?.data) return <OnePageShared data={cloud.data} />
    const stored = getPage(slug)
    if (stored) config = parsePageConfig(stored) ?? fallbackPageConfig(slug)
  }

  if (!config) return <PageStatus kind="missing" />

  return <TemplateRenderer config={config} footerAction={<DirectoryCreateLink />} />
}
