import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import './onepage-preview.css'

type PlatformCard = {
  id: string
  platform: string
  badge: string
  accent: string
  metric: string
  value: string
  url: string
  unit?: string
  insight: string
  generic?: boolean
  thumbnails?: string[]
}

type Persona = {
  id: 'designer' | 'developer'
  label: string
  avatar: string
  name: string
  job: string
  bio: string
  cards: PlatformCard[]
}

const DESIGNER_THUMBS = [
  'linear-gradient(135deg, #fde0ee 0%, #f8a5cd 55%, #ea4c89 100%)',
  'linear-gradient(135deg, #e8ecff 0%, #9fb4ff 55%, #3d5afe 100%)',
  'linear-gradient(135deg, #fff3e0 0%, #ffcc80 55%, #fb8c00 100%)',
]

const PERSONAS: Persona[] = [
  {
    id: 'designer',
    label: '设计师',
    avatar: '林',
    name: '林小满',
    job: '资深 UI 设计师 · 星海科技',
    bio: '8 年体验设计经验，相信好设计自己会说话。',
    cards: [
      {
        id: 'dribbble',
        platform: 'Dribbble',
        badge: 'Dr',
        accent: '#ea4c89',
        metric: '总获赞',
        value: '12.8k',
        url: 'https://dribbble.com/424096784emm',
        insight: '互动量超过 92% 的 UI 设计师',
        thumbnails: DESIGNER_THUMBS,
      },
      {
        id: 'behance',
        platform: 'Behance',
        badge: 'Be',
        accent: '#0057ff',
        metric: '作品总浏览',
        value: '3.4k',
        url: 'https://www.behance.net/linxiaoman',
        insight: '近 90 天浏览量稳步上升，增幅 46%',
      },
      {
        id: 'zcool',
        platform: '站酷',
        badge: '站',
        accent: '#ff552e',
        metric: '人气值',
        value: '856',
        url: 'https://www.zcool.com.cn/u/linxiaoman',
        insight: '3 件作品被编辑推荐至首页',
      },
      {
        id: 'site',
        platform: '个人作品集',
        badge: '集',
        accent: '#6c5ce7',
        metric: '精选项目',
        value: '32',
        unit: '个',
        url: 'https://linxiaoman.design',
        insight: '涵盖金融、电商、工具类 B/C 端设计',
      },
    ],
  },
  {
    id: 'developer',
    label: '研发',
    avatar: '陈',
    name: '陈默',
    job: '前端工程师 · 星河互联',
    bio: '7 年前端，专注工程效能与数据可视化。',
    cards: [
      {
        id: 'github',
        platform: 'GitHub',
        badge: 'GH',
        accent: '#24292f',
        metric: '总 Star',
        value: '2.1k',
        url: 'https://github.com/chenmo',
        insight: '前端影响力超过 95% 的同行',
      },
      {
        id: 'juejin',
        platform: '掘金',
        badge: '掘',
        accent: '#1e80ff',
        metric: '文章阅读量',
        value: '48w',
        url: 'https://juejin.cn/user/chenmo',
        insight: '3 篇专栏进入前端分类热榜',
      },
      {
        id: 'stackoverflow',
        platform: 'Stack Overflow',
        badge: 'SO',
        accent: '#f48024',
        metric: '声望值',
        value: '3.2k',
        url: 'https://stackoverflow.com/users/chenmo',
        insight: '回答采纳率 68%，高于社区均值',
      },
      {
        id: 'blog',
        platform: '技术博客',
        badge: '博',
        accent: '#00a678',
        metric: '周更写作',
        value: '126',
        unit: '篇',
        url: 'https://blog.chenmo.dev',
        insight: '持续更新 2 年 4 个月，从未断更',
      },
    ],
  },
]

/** 已知平台的模拟读取结果（黑客松演示数据），url 取用户粘贴的链接 */
const KNOWN_PLATFORMS: Record<string, Omit<PlatformCard, 'id' | 'url'>> = {
  'dribbble.com': {
    platform: 'Dribbble',
    badge: 'Dr',
    accent: '#ea4c89',
    metric: '总获赞',
    value: '12.8k',
    insight: '互动量超过 92% 的 UI 设计师',
    thumbnails: DESIGNER_THUMBS,
  },
  'behance.net': {
    platform: 'Behance',
    badge: 'Be',
    accent: '#0057ff',
    metric: '作品总浏览',
    value: '3.4k',
    insight: '近 90 天浏览量稳步上升，增幅 46%',
  },
  'zcool.com.cn': {
    platform: '站酷',
    badge: '站',
    accent: '#ff552e',
    metric: '人气值',
    value: '856',
    insight: '3 件作品被编辑推荐至首页',
  },
  'github.com': {
    platform: 'GitHub',
    badge: 'GH',
    accent: '#24292f',
    metric: '总 Star',
    value: '2.1k',
    insight: '前端影响力超过 95% 的同行',
  },
  'juejin.cn': {
    platform: '掘金',
    badge: '掘',
    accent: '#1e80ff',
    metric: '文章阅读量',
    value: '48w',
    insight: '3 篇专栏进入前端分类热榜',
  },
  'stackoverflow.com': {
    platform: 'Stack Overflow',
    badge: 'SO',
    accent: '#f48024',
    metric: '声望值',
    value: '3.2k',
    insight: '回答采纳率 68%，高于社区均值',
  },
}

type Detected =
  | { kind: 'known'; card: Omit<PlatformCard, 'id' | 'url'> }
  | { kind: 'generic'; domain: string }

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function detectUrl(raw: string): Detected | null {
  const m = raw.trim().match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i)
  if (!m) return null
  const domain = m[1].toLowerCase()
  for (const key of Object.keys(KNOWN_PLATFORMS)) {
    if (domain === key || domain.endsWith('.' + key)) {
      return { kind: 'known', card: KNOWN_PLATFORMS[key] }
    }
  }
  return { kind: 'generic', domain }
}

type SheetState =
  | { phase: 'input' }
  | { phase: 'loading'; steps: string[]; step: number; detected: Detected }
  | null

function ShareModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [qr, setQr] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: '#17203a' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [url])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="op-modal-mask"
      onClick={(e) => {
        if (!dialogRef.current?.contains(e.target as Node)) onClose()
      }}
    >
      <div className="op-modal" ref={dialogRef}>
        <button className="op-modal-close" onClick={onClose} aria-label="关闭">
          ✕
        </button>
        <h3>分享这一页</h3>
        <p className="op-modal-sub">扫一扫，在手机上查看这一页</p>
        {qr ? (
          <img className="op-modal-qr" src={qr} alt="页面二维码" />
        ) : (
          <div className="op-modal-qr op-modal-qr-loading">生成中…</div>
        )}
        <p className="op-modal-url">{url}</p>
      </div>
    </div>
  )
}

function Spinner() {
  return <span className="op-spinner" aria-hidden />
}

export function OnePagePreview() {
  const [personaId, setPersonaId] = useState<Persona['id']>('designer')
  const [sharing, setSharing] = useState(false)
  const [added, setAdded] = useState<Record<Persona['id'], PlatformCard[]>>({
    designer: [],
    developer: [],
  })
  const [justAddedId, setJustAddedId] = useState<string | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [sheet, setSheet] = useState<SheetState>(null)
  const [inputUrl, setInputUrl] = useState('')
  const timers = useRef<number[]>([])

  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0]
  const cards = [...persona.cards, ...added[personaId]]
  const pageUrl = window.location.href

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  useEffect(() => clearTimers, [])

  const closeSheet = () => {
    clearTimers()
    setSheet(null)
    setInputUrl('')
  }

  const finishAdd = (detected: Detected, url: string) => {
    closeSheet()
    if (detected.kind === 'known') {
      const existing = cards.find((c) => c.platform === detected.card.platform)
      if (existing) {
        // 已添加过：刷新高亮现有条目
        setFlashId(existing.id)
        timers.current.push(window.setTimeout(() => setFlashId(null), 1600))
        return
      }
      const id = `added-${detected.card.platform.toLowerCase()}-${personaId}`
      setAdded((prev) => ({
        ...prev,
        [personaId]: [...prev[personaId], { id, ...detected.card, url }],
      }))
      setJustAddedId(id)
    } else {
      const id = `added-${detected.domain}-${personaId}`
      const generic: PlatformCard = {
        id,
        platform: detected.domain,
        badge: detected.domain[0].toUpperCase(),
        accent: '#5b6478',
        metric: '主页链接',
        value: '✓',
        url,
        insight: `已收录「${detected.domain} 的个人主页」`,
        generic: true,
      }
      setAdded((prev) => ({ ...prev, [personaId]: [...prev[personaId], generic] }))
      setJustAddedId(id)
    }
  }

  const startRead = () => {
    const detected = detectUrl(inputUrl)
    if (!detected) return
    const url = normalizeUrl(inputUrl)
    const isKnown = detected.kind === 'known'
    const isDup = isKnown && cards.some((c) => c.platform === detected.card.platform)
    const steps = isKnown
      ? [
          `AI 正在打开你的 ${detected.card.platform} 主页…`,
          '正在读取平台数据…',
          isDup ? '✓ 已刷新最新数据' : '✓ 读取完成',
        ]
      : ['AI 正在识别这个平台…', '正在读取页面内容…', '✓ 读取完成']

    setSheet({ phase: 'loading', steps, step: 0, detected })
    timers.current.push(
      window.setTimeout(() => setSheet({ phase: 'loading', steps, step: 1, detected }), 1000),
    )
    timers.current.push(
      window.setTimeout(() => setSheet({ phase: 'loading', steps, step: 2, detected }), 2100),
    )
    timers.current.push(
      window.setTimeout(() => finishAdd(detected, url), 2900),
    )
  }

  const inputValid = detectUrl(inputUrl) !== null

  return (
    <div className="op-page">
      {/* 预览页专属：职业切换（不属于嵌入模块本身） */}
      <div className="op-switcher">
        <span className="op-switcher-hint">预览人设</span>
        <div className="op-switcher-pills" role="tablist">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={p.id === personaId}
              className={`op-switcher-pill${p.id === personaId ? ' is-active' : ''}`}
              onClick={() => setPersonaId(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 手机形态的脉脉个人主页 */}
      <div className="op-phone">
        <div className="op-m-profile">
          <div className="op-m-avatar">{persona.avatar}</div>
          <div className="op-m-info">
            <div className="op-m-name-row">
              <h1 className="op-m-name">{persona.name}</h1>
              <span className="op-m-cert">实名认证</span>
            </div>
            <p className="op-m-title">{persona.job}</p>
            <p className="op-m-bio">{persona.bio}</p>
          </div>
        </div>

        <div className="op-m-divider" />

        <section className="op-module">
          <div className="op-module-head">
            <div className="op-module-title-row">
              <span className="op-module-mark">1P</span>
              <div>
                <h2 className="op-module-title">One Page · 职业价值一览</h2>
                <p className="op-module-sub">聚合全网平台数据 · 每日更新</p>
              </div>
            </div>
            <button className="op-share-btn" onClick={() => setSharing(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3v13m0-13L7 8m5-5l5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              分享
            </button>
          </div>

          <div className="op-rows">
            {cards.map((card) => {
              const expandable = !!card.thumbnails
              const expanded = expandedId === card.id
              const cls = [
                'op-row',
                expanded ? 'is-expanded' : '',
                card.id === justAddedId ? 'is-entering' : '',
                card.id === flashId ? 'is-flashing' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <div className={cls} key={card.id}>
                  <a
                    className="op-row-main"
                    href={card.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="op-row-badge" style={{ background: card.accent }}>
                      {card.badge}
                    </span>
                    <span className="op-row-text">
                      <span className="op-row-platform">{card.platform}</span>
                      <span className="op-row-insight">
                        <span className="op-row-spark" style={{ color: card.accent }}>
                          ✦
                        </span>
                        {card.insight}
                      </span>
                    </span>
                    <span className="op-row-nums">
                      {card.generic ? (
                        <span className="op-row-pill">已收录</span>
                      ) : (
                        <>
                          <span className="op-row-value" style={{ color: card.accent }}>
                            {card.value}
                            {card.unit && <span className="op-row-unit">{card.unit}</span>}
                          </span>
                          <span className="op-row-metric">{card.metric}</span>
                        </>
                      )}
                    </span>
                    {expandable && (
                      <span
                        className={`op-row-chevron${expanded ? ' is-open' : ''}`}
                        role="button"
                        aria-label={expanded ? '收起' : '展开'}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setExpandedId(expanded ? null : card.id)
                        }}
                      >
                        ›
                      </span>
                    )}
                  </a>

                  {expanded && card.thumbnails && (
                    <div className="op-row-detail">
                      <div className="op-row-thumbs">
                        {card.thumbnails.map((bg, i) => (
                          <div key={i} className="op-row-thumb" style={{ background: bg }} />
                        ))}
                      </div>
                      <div className="op-row-detail-foot">
                        <p className="op-row-source">数据来自 {card.platform} · 刚刚更新</p>
                        <a
                          className="op-row-visit"
                          href={card.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          访问 {card.platform} 主页 →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* 添加链接 */}
            <button className="op-add-row" onClick={() => setSheet({ phase: 'input' })}>
              <span className="op-add-plus">+</span>
              添加链接
            </button>
          </div>

          <p className="op-module-foot">数据均来自平台直采 · 刚刚更新</p>
        </section>
      </div>

      {/* 添加链接：底部弹层 */}
      {sheet && (
        <div className="op-sheet-mask" onClick={closeSheet}>
          <div className="op-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="op-sheet-grabber" />
            {sheet.phase === 'input' && (
              <>
                <h3 className="op-sheet-title">添加链接</h3>
                <input
                  className="op-sheet-input"
                  autoFocus
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputValid) startRead()
                  }}
                  placeholder="粘贴你的主页链接，如 dribbble.com/xxx"
                />
                <p className="op-sheet-hint">✦ AI 将自动读取你的平台数据</p>
                <div className="op-sheet-actions">
                  <button className="op-sheet-cancel" onClick={closeSheet}>
                    取消
                  </button>
                  <button
                    className="op-sheet-go"
                    disabled={!inputValid}
                    onClick={startRead}
                  >
                    读取
                  </button>
                </div>
              </>
            )}
            {sheet.phase === 'loading' && (
              <div className="op-sheet-loading">
                <h3 className="op-sheet-title">读取中</h3>
                <ul className="op-steps">
                  {sheet.steps.slice(0, sheet.step + 1).map((text, i) => (
                    <li
                      key={i}
                      className={`op-step${i < sheet.step ? ' is-done' : ''}${
                        i === sheet.step && i === sheet.steps.length - 1 ? ' is-final' : ''
                      }`}
                    >
                      {i < sheet.step || i === sheet.steps.length - 1 ? (
                        <span className="op-step-check">✓</span>
                      ) : (
                        <Spinner />
                      )}
                      {text.replace(/^✓ /, '')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {sharing && <ShareModal url={pageUrl} onClose={() => setSharing(false)} />}
    </div>
  )
}
