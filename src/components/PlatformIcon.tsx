import { useState } from 'react'

const ICONS: Record<string, string> = {
  'dribbble.com': 'dribbble.png',
  'github.com': 'github.svg',
  'behance.net': 'behance.svg',
  'huaban.com': 'huaban.ico',
  'juejin.cn': 'juejin.png',
  'zcool.com.cn': 'zcool.svg',
  'stackoverflow.com': 'stackoverflow.ico',
}

function iconUrl(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const domain = Object.keys(ICONS).find((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
    return domain ? `${import.meta.env.BASE_URL}platform-icons/${ICONS[domain]}` : new URL('/favicon.ico', url.origin).href
  } catch { return null }
}

/** The adjacent platform name supplies the accessible label. */
export function PlatformIcon({ url }: { url: string }) {
  const src = iconUrl(url)
  const [failed, setFailed] = useState<string | null>(null)
  return (
    <span className="op-platform-icon" aria-hidden="true">
      {src && failed !== src ? (
        <img key={src} src={src} alt="" width="20" height="20" referrerPolicy="no-referrer" onError={() => setFailed(src)} />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <path d="M3 12h18M5 6.5h14M5 17.5h14" />
        </svg>
      )}
    </span>
  )
}
