import {
  BUTTON_STYLES,
  resolveButtonColors,
  wallpaperById,
  type OnePageLink,
  type OnePageShare,
} from '../onepage'
import './onepage-shared.css'
import { PlatformIcon } from '../components/PlatformIcon'

/** 目录式（编辑风）条目内容：品牌色点 + 宋体平台名 + 斜体解读，右侧宋体大数字 */
export function EditorialItemContent({ link }: { link: OnePageLink }) {
  return (
    <>
      <span className="opd-left">
        <span className="opd-platform">
          <PlatformIcon url={link.url} />
          {link.platform}
        </span>
        <span className="opd-insight">{link.insight}</span>
        {!link.generic && (
          <span className="opd-source">
            数据来自 {link.platform} · {link.source === 'snapshot' ? '历史快照' : '刚刚更新'}
          </span>
        )}
      </span>
      <span className="opd-right">
        {link.generic ? (
          <span className="opd-generic">已收录</span>
        ) : (
          <>
            <strong className="opd-num">
              {link.value}
              {link.unit ?? ''}
            </strong>
            <small className="opd-metric">{link.metric}</small>
          </>
        )}
      </span>
    </>
  )
}

/**
 * One Page 独立分享页（#/p/<slug>?d=<encoded>）。
 * 默认纸感壁纸时为编辑风目录条目；用户定制壁纸/按钮后套用其选择。
 */
export function OnePageShared({ data }: { data: OnePageShare }) {
  const wallpaper = wallpaperById(data.wallpaper)
  const radius = BUTTON_STYLES.find((b) => b.id === data.buttonStyle)?.radius ?? '999px'
  const btn = resolveButtonColors(wallpaper, data.buttonColor)
  const editorial = false

  return (
    <div className="ops-page" style={{ background: wallpaper.bg, color: wallpaper.text }}>
      <div className="ops-column">
        <div className="ops-avatar">{data.avatar}</div>
        <h1 className="ops-name">{data.name}</h1>
        <p className="ops-title">{data.title}</p>
        {data.bio && <p className="ops-bio">{data.bio}</p>}

        {editorial ? (
          <div className="opd-list">
            {data.links.map((link) => (
              <a
                key={link.platform}
                className="opd-item"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <EditorialItemContent link={link} />
              </a>
            ))}
            {data.links.length === 0 && <p className="ops-empty">这个页面还没有添加链接</p>}
          </div>
        ) : (
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
                <span className="ops-link-badge">
                  <PlatformIcon url={link.url} />
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
        )}

        <p className="ops-foot">数据来自平台直采 · 由 One Page 生成</p>
      </div>
    </div>
  )
}
