import { useEffect, useState } from 'react'

/** 极简 hash 路由：#/、#/create、#/p/:slug */

export function useHashPath(): string {
  const [path, setPath] = useState(() => window.location.hash.replace(/^#/, '') || '/')

  useEffect(() => {
    const onChange = () => setPath(window.location.hash.replace(/^#/, '') || '/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return path
}

export function navigate(path: string): void {
  window.location.hash = path
}

export function pageUrl(slug: string, data?: string): string {
  const { origin, pathname } = window.location
  const query = data ? `?d=${data}` : ''
  return `${origin}${pathname}#/p/${slug}${query}`
}
