import {
  BUTTON_STYLES,
  resolveButtonColors,
  wallpaperById,
  type OnePageShare,
} from '../onepage'
import './onepage-shared.css'

/**
 * One Page 独立分享页（#/p/<slug>?d=<encoded>）。
 * Linktree 风格：壁纸色整页背景 + 头像姓名 + 按钮式链接条目，数据全部来自 URL。
 */
export function OnePageShared({ data }: { data: OnePageShare }) {
  const wallpaper = wallpaperById(data.wallpaper)
  const radius = BUTTON_STYLES.find((b) => b.id === data.buttonStyle)?.radius ?? '999px'
  const btn = resolveButtonColors(wallpaper, data.buttonColor)

  return (
    <div className="ops-page" style={{ background: wallpaper.bg, color: wallpaper.text }}>
      <div className="ops-column">
        <div className="ops-avatar" style={{ borderColor: wallpaper.text }}>
          {data.avatar}
        </div>
        <h1 className="ops-name">{data.name}</h1>
        <p className="ops-title">{data.title}</p>
        {data.bio && <p className="ops-bio">{data.bio}</p>}

        <div className="ops-links">
          {data.links.map((link) => (
            <a
              key={link.platform}
              className="ops-link"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: btn.bg, color: btn.text, borderRadius: radius, borderColor: btn.border }}
            >
              <span className="ops-link-badge" style={{ background: link.accent }}>
                {link.badge}
              </span>
              <span className="ops-link-text">
                <strong>{link.platform}</strong>
                <small>
                  {link.generic
                    ? link.insight
                    : `${link.value}${link.unit ?? ''} ${link.metric} · ${link.insight}`}
                </small>
              </span>
              <span className="ops-link-arrow">›</span>
            </a>
          ))}
          {data.links.length === 0 && <p className="ops-empty">这个页面还没有添加链接</p>}
        </div>

        <p className="ops-foot">
          由 <strong>One Page</strong> 生成 · 嵌入脉脉个人主页
        </p>
      </div>
    </div>
  )
}
