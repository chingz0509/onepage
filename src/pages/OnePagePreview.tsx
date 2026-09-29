import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { encodeJson } from '../shareCodec'
import { pageUrl } from '../router'
import {
  BUTTON_COLORS,
  BUTTON_STYLES,
  WALLPAPERS,
  resolveButtonColors,
  wallpaperById,
  type ButtonColorId,
  type ButtonStyleId,
  type OnePageLink,
  type OnePageShare,
} from '../onepage'
import './onepage-preview.css'

type PersonaId = 'designer' | 'developer'

type Persona = {
  id: PersonaId
  label: string
  avatar: string
  name: string
  job: string
  bio: string
  placeholders: string[]
}

const PERSONAS: Persona[] = [
  {
    id: 'designer',
    label: '设计师',
    avatar: '林',
    name: '林小满',
    job: '资深 UI 设计师 · 星海科技',
    bio: '8 年体验设计经验，相信好设计自己会说话。',
    placeholders: ['dribbble.com/xxx', 'behance.net/xxx', '你的作品集网址'],
  },
  {
    id: 'developer',
    label: '研发',
    avatar: '陈',
    name: '陈默',
    job: '前端工程师 · 星河互联',
    bio: '7 年前端，专注工程效能与数据可视化。',
    placeholders: ['github.com/xxx', 'juejin.cn/user/xxx', '你的博客网址'],
  },
]

/** 已知平台的模拟读取结果（黑客松演示数据），url 取用户粘贴的链接 */
const KNOWN_PLATFORMS: Record<string, Omit<OnePageLink, 'url'>> = {
  'dribbble.com': {
    platform: 'Dribbble',
    badge: 'Dr',
    accent: '#ea4c89',
    metric: '总获赞',
    value: '12.8k',
    insight: '互动量超过 92% 的 UI 设计师',
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
  | { kind: 'known'; card: Omit<OnePageLink, 'url'> }
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

function randomSlug(): string {
  return Math.random().toString(36).slice(2, 8)
}

function Spinner() {
  return <span className="op-spinner" aria-hidden />
}

/** 紧凑条目（预览 / 嵌入模块通用展示） */
function LinkRow({ link, flashing }: { link: OnePageLink; flashing?: boolean }) {
  return (
    <a
      className={`op-row-main op-row-standalone${flashing ? ' is-flashing' : ''}`}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="op-row-badge" style={{ background: link.accent }}>
        {link.badge}
      </span>
      <span className="op-row-text">
        <span className="op-row-platform">{link.platform}</span>
        <span className="op-row-insight">
          <span className="op-row-spark" style={{ color: link.accent }}>
            ✦
          </span>
          {link.insight}
        </span>
      </span>
      <span className="op-row-nums">
        {link.generic ? (
          <span className="op-row-pill">已收录</span>
        ) : (
          <>
            <span className="op-row-value" style={{ color: link.accent }}>
              {link.value}
              {link.unit && <span className="op-row-unit">{link.unit}</span>}
            </span>
            <span className="op-row-metric">{link.metric}</span>
          </>
        )}
      </span>
    </a>
  )
}

type LinkSlot = { id: number; value: string; card: OnePageLink | null }

export function OnePagePreview() {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0)
  // 预览固定使用设计师人设；研发人设数据保留在 PERSONAS 里备用
  const persona = PERSONAS[0]

  // 第 1 步：资料
  const [name, setName] = useState(persona.name)
  const [job, setJob] = useState(persona.job)
  const [bio, setBio] = useState(persona.bio)

  // 第 2 步：链接
  const [slots, setSlots] = useState<LinkSlot[]>([])
  const slotSeq = useRef(0)
  const [flashPlatform, setFlashPlatform] = useState<string | null>(null)
  const [sheet, setSheet] = useState<{ steps: string[]; step: number } | null>(null)
  const timers = useRef<number[]>([])

  // 第 3 步：风格
  const [wallpaperId, setWallpaperId] = useState('cream')
  const [buttonStyle, setButtonStyle] = useState<ButtonStyleId>('pill')
  const [buttonColor, setButtonColor] = useState<ButtonColorId>('black')
  const [styleTab, setStyleTab] = useState<'wallpaper' | 'button'>('wallpaper')

  // 第 4 步：分享
  const [shareUrl, setShareUrl] = useState('')
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  const links = slots.filter((s) => s.card).map((s) => s.card as OnePageLink)
  const wallpaper = wallpaperById(wallpaperId)

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const newSlot = (): LinkSlot => ({ id: ++slotSeq.current, value: '', card: null })

  const enterStep2 = () => {
    if (slots.length === 0) setSlots([newSlot(), newSlot(), newSlot()])
    setStep(2)
  }

  const startRead = (slotId: number) => {
    const slot = slots.find((s) => s.id === slotId)
    if (!slot) return
    const detected = detectUrl(slot.value)
    if (!detected) return
    const url = normalizeUrl(slot.value)
    const isKnown = detected.kind === 'known'
    const isDup = isKnown && links.some((l) => l.platform === detected.card.platform)
    const steps = isKnown
      ? [
          `AI 正在打开你的 ${detected.card.platform} 主页…`,
          '正在读取平台数据…',
          isDup ? '✓ 已刷新最新数据' : '✓ 读取完成',
        ]
      : ['AI 正在识别这个平台…', '正在读取页面内容…', '✓ 读取完成']

    setSheet({ steps, step: 0 })
    timers.current.push(window.setTimeout(() => setSheet({ steps, step: 1 }), 1000))
    timers.current.push(window.setTimeout(() => setSheet({ steps, step: 2 }), 2100))
    timers.current.push(
      window.setTimeout(() => {
        setSheet(null)
        if (isKnown && isDup) {
          // 已添加过：刷新高亮现有条目，清空这个输入框
          setFlashPlatform(detected.card.platform)
          timers.current.push(window.setTimeout(() => setFlashPlatform(null), 1600))
          setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, value: '' } : s)))
          return
        }
        const card: OnePageLink =
          detected.kind === 'known'
            ? { ...detected.card, url }
            : {
                platform: detected.domain,
                badge: detected.domain[0].toUpperCase(),
                accent: '#5b6478',
                metric: '主页链接',
                value: '✓',
                url,
                insight: `已收录「${detected.domain} 的个人主页」`,
                generic: true,
              }
        setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, card } : s)))
      }, 2900),
    )
  }

  const publish = () => {
    const payload: OnePageShare = {
      kind: 'onepage',
      slug: randomSlug(),
      name,
      title: job,
      bio,
      avatar: name.trim()[0] ?? persona.avatar,
      wallpaper: wallpaperId,
      buttonStyle,
      buttonColor,
      links,
    }
    const url = pageUrl(payload.slug, encodeJson(payload))
    setShareUrl(url)
    setStep(4)
  }

  useEffect(() => {
    if (step !== 4 || !shareUrl) return
    QRCode.toDataURL(shareUrl, { width: 320, margin: 1, color: { dark: '#17203a' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [step, shareUrl])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const avatarChar = name.trim()[0] ?? persona.avatar

  const profileHeader = (
    <div className="op-m-profile">
      <div className="op-m-avatar">{avatarChar}</div>
      <div className="op-m-info">
        <div className="op-m-name-row">
          <h1 className="op-m-name">{name}</h1>
          <span className="op-m-cert">实名认证</span>
        </div>
        <p className="op-m-title">{job}</p>
        <p className="op-m-bio">{bio}</p>
      </div>
    </div>
  )

  const moduleHeader = (
    <div className="op-module-head">
      <div className="op-module-title-row">
        <span className="op-module-mark">1P</span>
        <div>
          <h2 className="op-module-title">One Page · 职业价值一览</h2>
          <p className="op-module-sub">聚合全网平台数据 · 每日更新</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="op-page">
      {/* ———— 第 0 屏：脉脉个人页 mock（入口） ———— */}
      {step === 0 && (
        <div className="op-phone">
          {profileHeader}
          <div className="op-m-divider" />
          <button className="op-entry-card" onClick={() => setStep(1)}>
            <span className="op-entry-plus">+</span>
            <span className="op-entry-text">
              <strong>One Page · 展示你的职业价值</strong>
              <small>把站外平台的数据聚合到脉脉主页，1 分钟完成</small>
            </span>
            <span className="op-entry-arrow">›</span>
          </button>
          <p className="op-module-foot">One Page 模块尚未开启</p>
        </div>
      )}

      {/* ———— 第 1-3 步：上手向导 ———— */}
      {(step === 1 || step === 2 || step === 3) && (
        <div className="op-phone">
          <div className="op-wiz-top">
            <button
              className="op-wiz-back"
              aria-label="返回"
              onClick={() => setStep((step - 1) as 0 | 1 | 2)}
            >
              ←
            </button>
            <div className="op-wiz-progress">
              <div className="op-wiz-progress-fill" style={{ width: `${(step / 3) * 100}%` }} />
            </div>
            <span className="op-wiz-count">{step} / 3</span>
          </div>

          {step === 1 && (
            <>
              <h2 className="op-wiz-title">
                确认一下，<em>这是你</em>
              </h2>
              <p className="op-wiz-sub">信息来自你的脉脉资料，随时可改</p>
              <div className="op-form">
                <label className="op-field">
                  <span className="op-field-label">姓名</span>
                  <input className="op-field-input" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="op-field">
                  <span className="op-field-label">职位</span>
                  <input className="op-field-input" value={job} onChange={(e) => setJob(e.target.value)} />
                </label>
                <label className="op-field">
                  <span className="op-field-label">一句话简介</span>
                  <textarea
                    className="op-field-input op-field-textarea"
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </label>
              </div>
              <div className="op-wiz-actions">
                <button className="op-btn-continue" onClick={enterStep2}>
                  继续
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="op-wiz-title">
                添加你的<em>价值链接</em>
              </h2>
              <p className="op-wiz-sub">贴上主页链接，AI 自动读取平台数据生成卡片</p>
              <div className="op-slots">
                {slots.map((slot, i) =>
                  slot.card ? (
                    <div className="op-slot-done" key={slot.id}>
                      <LinkRow
                        link={slot.card}
                        flashing={flashPlatform === slot.card.platform}
                      />
                    </div>
                  ) : (
                    <div className="op-slot" key={slot.id}>
                      <input
                        className="op-slot-input"
                        value={slot.value}
                        placeholder={persona.placeholders[i] ?? '粘贴你的主页链接'}
                        onChange={(e) =>
                          setSlots((prev) =>
                            prev.map((s) => (s.id === slot.id ? { ...s, value: e.target.value } : s)),
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && detectUrl(slot.value)) startRead(slot.id)
                        }}
                      />
                      <button
                        className="op-slot-go"
                        disabled={!detectUrl(slot.value)}
                        onClick={() => startRead(slot.id)}
                      >
                        读取
                      </button>
                    </div>
                  ),
                )}
                <button
                  className="op-add-row"
                  onClick={() => setSlots((prev) => [...prev, newSlot()])}
                >
                  <span className="op-add-plus">+</span>
                  添加链接
                </button>
              </div>
              <div className="op-wiz-actions">
                <button className="op-btn-continue" onClick={() => setStep(3)}>
                  继续{links.length > 0 && `（已添加 ${links.length} 条）`}
                </button>
                <button className="op-btn-skip" onClick={() => setStep(3)}>
                  跳过
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="op-wiz-title">
                定制你的<em>风格</em>
              </h2>
              <p className="op-wiz-sub">这是访客打开你的分享链接时看到的页面</p>

              {/* 实时预览 */}
              <div className="op-style-preview" style={{ background: wallpaper.bg }}>
                <div
                  className="op-style-avatar"
                  style={{ color: wallpaper.text, borderColor: wallpaper.text }}
                >
                  {avatarChar}
                </div>
                <p className="op-style-name" style={{ color: wallpaper.text }}>
                  {name}
                </p>
                <p className="op-style-bio" style={{ color: wallpaper.text }}>
                  {bio}
                </p>
                <div className="op-style-links">
                  {links.length === 0 && (
                    <p className="op-style-empty" style={{ color: wallpaper.text }}>
                      还没有链接，可返回上一步添加
                    </p>
                  )}
                  {links.map((link) => {
                    const c = resolveButtonColors(wallpaper, buttonColor)
                    const radius = BUTTON_STYLES.find((b) => b.id === buttonStyle)?.radius
                    return (
                      <span
                        key={link.platform}
                        className="op-style-link"
                        style={{ background: c.bg, color: c.text, borderRadius: radius, borderColor: c.border }}
                      >
                        <strong>{link.platform}</strong>
                        <span>
                          {link.value}
                          {link.unit ?? ''} · {link.metric}
                        </span>
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* 定制 tab */}
              <div className="op-tabs">
                <button
                  className={`op-tab${styleTab === 'wallpaper' ? ' is-active' : ''}`}
                  onClick={() => setStyleTab('wallpaper')}
                >
                  壁纸
                </button>
                <button
                  className={`op-tab${styleTab === 'button' ? ' is-active' : ''}`}
                  onClick={() => setStyleTab('button')}
                >
                  按钮
                </button>
              </div>

              {styleTab === 'wallpaper' && (
                <div className="op-swatches">
                  {WALLPAPERS.map((w) => (
                    <button
                      key={w.id}
                      className={`op-swatch${w.id === wallpaperId ? ' is-active' : ''}`}
                      style={{ background: w.bg }}
                      title={w.name}
                      onClick={() => setWallpaperId(w.id)}
                    >
                      {w.id === wallpaperId && (
                        <span style={{ color: w.text }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {styleTab === 'button' && (
                <>
                  <div className="op-btnstyles">
                    {BUTTON_STYLES.map((b) => (
                      <button
                        key={b.id}
                        className={`op-btnstyle${b.id === buttonStyle ? ' is-active' : ''}`}
                        onClick={() => setButtonStyle(b.id)}
                      >
                        <span className="op-btnstyle-demo" style={{ borderRadius: b.radius }} />
                        {b.name}
                      </button>
                    ))}
                  </div>
                  <div className="op-btncolors">
                    {BUTTON_COLORS.map((c) => (
                      <button
                        key={c.id}
                        className={`op-btncolor${c.id === buttonColor ? ' is-active' : ''}`}
                        onClick={() => setButtonColor(c.id)}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="op-wiz-actions">
                <button className="op-btn-continue" onClick={publish}>
                  发布我的 One Page
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ———— 第 4 步：完成 ———— */}
      {step === 4 && (
        <>
          <h2 className="op-done-title">🎉 你的 One Page 已上线</h2>
          <p className="op-done-sub">模块已嵌入你的脉脉主页，也可以把独立页分享给任何人</p>

          <div className="op-phone">
            {profileHeader}
            <div className="op-m-divider" />
            <section className="op-module op-module-landing">
              {moduleHeader}
              <div className="op-rows">
                {links.map((link) => (
                  <div className="op-row" key={link.platform}>
                    <LinkRow link={link} />
                  </div>
                ))}
                {links.length === 0 && (
                  <p className="op-module-empty">还没有链接，回到上一步添加吧</p>
                )}
              </div>
              <p className="op-module-foot">数据均来自平台直采 · 刚刚更新</p>
            </section>
          </div>

          <div className="op-share-card">
            {qr ? (
              <img className="op-share-qr" src={qr} alt="分享二维码" />
            ) : (
              <div className="op-share-qr op-share-qr-loading">生成中…</div>
            )}
            <p className="op-share-url">{shareUrl}</p>
            <div className="op-share-actions">
              <button className="op-btn-continue op-btn-copy" onClick={copyLink}>
                {copied ? '✓ 已复制' : '复制链接'}
              </button>
              <a className="op-btn-open" href={shareUrl} target="_blank" rel="noopener noreferrer">
                打开看看 →
              </a>
            </div>
            <button className="op-btn-skip" onClick={() => setStep(0)}>
              返回脉脉主页
            </button>
          </div>
        </>
      )}

      {/* AI 读取进度：底部弹层 */}
      {sheet && (
        <div className="op-sheet-mask">
          <div className="op-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="op-sheet-grabber" />
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
          </div>
        </div>
      )}
    </div>
  )
}
