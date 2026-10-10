import type { OnePageShare } from '../src/onepage.js'

const text = (value: unknown, limit: number): value is string =>
  typeof value === 'string' && value.length <= limit

function webUrl(value: unknown): value is string {
  if (!text(value, 2048)) return false
  try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false }
}

/** Validate public content before it is stored or rendered as links/images. */
export function validPageData(value: unknown): value is OnePageShare {
  if (!value || typeof value !== 'object') return false
  const d = value as Record<string, unknown>
  if (d.kind !== 'onepage' || !text(d.name, 80) || !d.name.trim() ||
    !text(d.title, 160) || !text(d.bio, 800) || !text(d.avatar, 8) ||
    !text(d.wallpaper, 64) || !['square', 'round', 'pill'].includes(String(d.buttonStyle)) ||
    !['black', 'white', 'blue', 'wallpaper'].includes(String(d.buttonColor))) return false
  if (d.avatarImage && !(webUrl(d.avatarImage) ||
    (text(d.avatarImage, 175000) && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(d.avatarImage)))) return false
  return Array.isArray(d.links) && d.links.length <= 30 && d.links.every((link: unknown) => {
    if (!link || typeof link !== 'object') return false
    const l = link as Record<string, unknown>
    return webUrl(l.url) && text(l.platform, 100) && text(l.badge, 80) &&
      text(l.accent, 80) && text(l.metric, 100) && text(l.value, 80) &&
      text(l.insight, 600) && (l.unit === undefined || text(l.unit, 30)) &&
      (l.generic === undefined || typeof l.generic === 'boolean') &&
      (l.source === undefined || ['live', 'snapshot'].includes(String(l.source)))
  })
}
