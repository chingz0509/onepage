import {
  BUTTON_STYLES,
  resolveButtonColors,
  wallpaperById,
  type OnePageShare,
} from '../onepage'
import './onepage-shared.css'

/**
 * One Page 独立分享页（#/p/<slug>?d=<encoded>）。
 * Linktree 风格：壁纸全屏铺开 + 居中头像姓名 + 通栏按钮条目，数据全部来自 URL。
 */
export function OnePageShared({ data }: { data: OnePageShare }) {
  const wallpaper = wallpaperById(data.wallpaper)
  const radius = BUTTON_STYLES.find((b) => b.id === data.buttonStyle)?.radius ?? '999px'
  const btn = resolveButtonColors(wallpaper, data.buttonColor)

  return (
    <div className="ops-page" style={{ background: wallpaper.bg, color: wallpaper.text }}>
      <div className="ops-column">
        <div className="ops-avatar">{data.avatar}</div>
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
              <span className="ops-link-name">{link.platform}</span>
              <span className="ops-link-nums">
                {link.generic ? (
                  <span className="ops-link-generic">已收录</span>
                ) : (
                  <>
                    <strong>
                      {link.value}
                      {link.unit ?? ''}
                    </strong>
                    <small>{link.metric}</small>
                  </>
                )}
              </span>
            </a>
          ))}
          {data.links.length === 0 && <p className="ops-empty">这个页面还没有添加链接</p>}
        </div>

        <p className="ops-foot">数据来自平台直采 · 由 One Page 生成</p>
      </div>
    </div>
  )
}
