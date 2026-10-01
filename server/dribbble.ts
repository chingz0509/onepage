/** Read Dribbble's public thumbnail data as JSON, never evaluate page scripts. */
export function dribbbleMetrics(html: string, url: string): { label: string; value: string }[] {
  const target = new URL(url)
  if (!/^(www\.)?dribbble\.com$/i.test(target.hostname) || !/^\/[^/]+\/?$/.test(target.pathname)) return []
  const shots = new Map<string, { likes: number; views: number | null }>()
  for (const match of html.matchAll(/\b(?:var|let|const)\s+newestShots\s*=\s*\[/g)) {
    const start = (match.index ?? 0) + match[0].length - 1
    let depth = 0, quoted = false, escaped = false
    for (let end = start; end < html.length; end++) {
      const char = html[end]
      if (quoted) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === '"') quoted = false
        continue
      }
      if (char === '"') quoted = true
      else if (char === '[') depth++
      else if (char === ']' && --depth === 0) {
        try {
          const data: unknown = JSON.parse(html.slice(start, end + 1))
          if (Array.isArray(data)) for (const shot of data) {
            if (!shot || typeof shot !== 'object' || !/^\d+$/.test(String(shot.id))) continue
            const likes = parseCount(shot.likes_count)
            if (likes !== null) shots.set(String(shot.id), { likes, views: parseCount(shot.view_count) })
          }
        } catch { /* Missing or changed source data must not become a fake zero. */ }
        break
      }
    }
  }
  if (!shots.size) return []
  const records = [...shots.values()]
  const result = [{ label: '本页获赞', value: String(records.reduce((total, shot) => total + shot.likes, 0)) }]
  if (records.every((shot) => shot.views !== null)) {
    result.push({ label: '本页浏览', value: String(records.reduce((total, shot) => total + (shot.views ?? 0), 0)) })
  }
  result.push({ label: '本页作品', value: String(shots.size) })
  return result
}

function parseCount(value: unknown): number | null {
  const raw = String(value ?? '').trim().replace(/,/g, '')
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*([km]?)$/i)
  if (!match) return null
  const number = Number(match[1]) * ({ k: 1000, m: 1000000 }[match[2].toLowerCase()] ?? 1)
  return Number.isSafeInteger(Math.round(number)) ? Math.round(number) : null
}
