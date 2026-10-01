import { useEffect, useRef, useState, type CSSProperties } from 'react'
import QRCode from 'qrcode'
import { encodeJson } from '../shareCodec'
import { pageUrl } from '../router'
import { fetchPlatformMetrics } from '../dataFetch'
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
  type Wallpaper,
} from '../onepage'
import { EditorialItemContent } from './OnePageShared'
import './onepage-preview.css'
import './onepage-shared.css'

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
    value: '388',
    insight: '33 件作品 · 累计 102.9k 浏览',
  },
  'behance.net': {
    platform: 'Behance',
    badge: 'Be',
    accent: '#1769ff',
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
    value: '0',
    insight: '5 个公开仓库 · 1 位关注者，正在积累开源影响力',
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

function cardFromDetected(detected: Detected, url: string): OnePageLink {
  return detected.kind === 'known'
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
}

function randomSlug(): string {
  return Math.random().toString(36).slice(2, 8)
}

/** 数字小幅随机上涨（保留 k/w 后缀），模拟拉取最新数据 */
function bumpValue(v: string): string {
  const m = v.match(/^([\d.]+)([kw]?)$/i)
  if (!m) return v
  const n = parseFloat(m[1]) * (1 + 0.01 + Math.random() * 0.04)
  const decimals = m[1].includes('.') ? 1 : 0
  return `${n.toFixed(decimals)}${m[2]}`
}

type LinkSlot = { id: number; card: OnePageLink | null }

/** 内联读取步骤（宋体斜体小字，逐行浮现） */
const READ_STEPS = ['正在打开主页…', '正在读取平台数据…', '正在核实数据…', '✓ 读取完成']

/**
 * 贴上即读的输入槽：去抖 600ms 自动触发，原地逐行浮现步骤小字，
 * 期间并行拉取真实数据（dataFetch 三轨制），完成后经 onResolve 交给父级变条目；
 * 重复平台走 onDuplicate 并自我清空。每个槽位独立持有自己的计时器，多槽并行互不阻塞。
 */
function LinkInputSlot(props: {
  placeholder: string
  isDuplicate: (platform: string) => boolean
  onResolve: (card: OnePageLink) => void
  onDuplicate: (platform: string) => void
}) {
  const [value, setValue] = useState('')
  const [reading, setReading] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [finalText, setFinalText] = useState(READ_STEPS[3])
  const debounceRef = useRef<number | null>(null)
  const stepTimers = useRef<number[]>([])

  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      stepTimers.current.forEach((t) => window.clearTimeout(t))
    },
    [],
  )

  const start = (v: string) => {
    const detected = detectUrl(v)
    if (!detected) return
    const url = normalizeUrl(v)
    const dup = detected.kind === 'known' && props.isDuplicate(detected.card.platform)
    setFinalText(dup ? '✓ 已刷新最新数据' : READ_STEPS[3])
    setReading(true)
    setStepIdx(0)
    stepTimers.current.push(window.setTimeout(() => setStepIdx(1), 900))
    stepTimers.current.push(window.setTimeout(() => setStepIdx(2), 1800))

    // 真实数据获取与步骤动画并行；两者都就绪才进入完成步
    const minTime = new Promise((r) => stepTimers.current.push(window.setTimeout(r, 2700)))
    const fetchP =
      detected.kind === 'known' && !dup
        ? fetchPlatformMetrics(detected.card.platform, url)
        : Promise.resolve(null)
    void Promise.all([minTime, fetchP]).then(([, metrics]) => {
      setStepIdx(3)
      stepTimers.current.push(
        window.setTimeout(() => {
          if (dup && detected.kind === 'known') {
            props.onDuplicate(detected.card.platform)
            setValue('')
            setReading(false)
            return
          }
          const base = cardFromDetected(detected, url)
          const card: OnePageLink = metrics
            ? {
                ...base,
                metric: metrics.metric,
                value: metrics.value,
                unit: metrics.unit,
                insight: metrics.insight,
                source: metrics.source,
              }
            : { ...base, source: 'snapshot' }
          props.onResolve(card)
        }, 700),
      )
    })
  }

  const onChange = (v: string) => {
    setValue(v)
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => start(v), 600)
  }

  const invalid = !reading && value.trim() !== '' && !detectUrl(value)

  return (
    <div className={`op-slot${reading ? ' is-reading' : ''}`}>
      <div className="op-slot-field">
        <input
          className="op-slot-input"
          value={value}
          placeholder={props.placeholder}
          disabled={reading}
          onChange={(e) => onChange(e.target.value)}
        />
        {reading && (
          <div className="op-slot-steps">
            {READ_STEPS.slice(0, stepIdx + 1).map((text, i) => (
              <span key={i} className={`op-slot-step${i === 2 ? ' is-final' : ''}`}>
                {i === 2 ? finalText : text}
              </span>
            ))}
          </div>
        )}
      </div>
      {invalid && <p className="op-slot-error">这看起来不是一个链接</p>}
    </div>
  )
}

type PublishedState = {
  name: string
  job: string
  bio: string
  links: OnePageLink[]
  wallpaperId: string
  buttonStyle: ButtonStyleId
  buttonColor: ButtonColorId
  shareUrl: string
}

const STORAGE_KEY = 'onepage.published.v1'

function loadPublished(): PublishedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as PublishedState
    return Array.isArray(data.links) ? data : null
  } catch {
    return null
  }
}

type Sheet =
  | { kind: 'style' }
  | null

/** 主页条目按钮的内容（左侧图标 / 中间平台名 / 右侧数字），<a> 或 <span> 均可套用 */
function LinkButtonContent({ link }: { link: OnePageLink }) {
  return (
    <>
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
    </>
  )
}

export function OnePagePreview() {
  const [initial] = useState(loadPublished)
  const persona = PERSONAS[0]

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [published, setPublished] = useState(initial !== null)

  // 资料
  const [name, setName] = useState(initial?.name ?? persona.name)
  const [job, setJob] = useState(initial?.job ?? persona.job)
  const [bio, setBio] = useState(initial?.bio ?? persona.bio)

  // 已发布条目（管理闭环的工作数据）
  const [links, setLinks] = useState<OnePageLink[]>(initial?.links ?? [])

  // 向导第 2 步的输入槽
  const [slots, setSlots] = useState<LinkSlot[]>([])
  const slotSeq = useRef(0)

  // 风格
  const [wallpaperId, setWallpaperId] = useState(initial?.wallpaperId ?? 'cream')
  const [buttonStyle, setButtonStyle] = useState<ButtonStyleId>(initial?.buttonStyle ?? 'pill')
  const [buttonColor, setButtonColor] = useState<ButtonColorId>(initial?.buttonColor ?? 'black')
  const [styleTab, setStyleTab] = useState<'wallpaper' | 'button'>('wallpaper')

  // 分享
  const [shareUrl, setShareUrl] = useState(initial?.shareUrl ?? '')
  const [shareOpen, setShareOpen] = useState(false)
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  // 管理闭环
  const [editing, setEditing] = useState(false)
  const [visitor, setVisitor] = useState(false)
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const [flashAll, setFlashAll] = useState(false)
  const [undo, setUndo] = useState<{ link: OnePageLink; index: number } | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [editSlots, setEditSlots] = useState<number[]>([])

  const timers = useRef<number[]>([])
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const wallpaper = wallpaperById(wallpaperId)
  const avatarChar = name.trim()[0] ?? persona.avatar
  const wizardLinks = slots.filter((s) => s.card).map((s) => s.card as OnePageLink)

  const radius = BUTTON_STYLES.find((b) => b.id === buttonStyle)?.radius ?? '999px'
  const btnColors = resolveButtonColors(wallpaper, buttonColor)
  // 默认纸感壁纸下条目用编辑风目录样式；用户定制壁纸后套用用户选择
  const editorial = wallpaperId === 'cream'
  const linkBtnStyle: CSSProperties = {
    background: btnColors.bg,
    color: btnColors.text,
    borderRadius: radius,
    borderColor: btnColors.border,
  }

  const pageStyle = {
    background: wallpaper.bg,
    color: wallpaper.text,
    '--wiz-text': wallpaper.text,
    '--wiz-btn-bg': wallpaper.dark ? '#ffffff' : '#1a1a18',
    '--wiz-btn-text': '#ffffff',
  } as CSSProperties

  const persist = (next?: Partial<PublishedState>) => {
    const data: PublishedState = {
      name,
      job,
      bio,
      links,
      wallpaperId,
      buttonStyle,
      buttonColor,
      shareUrl,
      ...next,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  const resetDemo = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setPublished(false)
    setStep(0)
    setName(persona.name)
    setJob(persona.job)
    setBio(persona.bio)
    setLinks([])
    setSlots([])
    setWallpaperId('cream')
    setButtonStyle('pill')
    setButtonColor('black')
    setShareUrl('')
    setShareOpen(false)
    setEditing(false)
    setVisitor(false)
    setUndo(null)
  }

  // —— 向导 ——

  const newSlot = (): LinkSlot => ({ id: ++slotSeq.current, card: null })

  const enterStep2 = () => {
    if (slots.length === 0) setSlots([newSlot(), newSlot(), newSlot()])
    setStep(2)
  }

  /** 平台去重：向导槽位卡片 + 已发布条目一起查 */
  const isDupPlatform = (platform: string) =>
    wizardLinks.some((l) => l.platform === platform) ||
    links.some((l) => l.platform === platform)

  const flashPlatform = (platform: string) => {
    setFlashKey(platform)
    timers.current.push(window.setTimeout(() => setFlashKey(null), 1600))
  }

  const publish = () => {
    const payload: OnePageShare = {
      kind: 'onepage',
      slug: randomSlug(),
      name,
      title: job,
      bio,
      avatar: avatarChar,
      wallpaper: wallpaperId,
      buttonStyle,
      buttonColor,
      links: wizardLinks,
    }
    const url = pageUrl(payload.slug, encodeJson(payload))
    setShareUrl(url)
    setLinks(wizardLinks)
    setPublished(true)
    persist({ links: wizardLinks, shareUrl: url })
    setStep(0)
    setShareOpen(true)
  }

  useEffect(() => {
    if (!shareOpen || !shareUrl) return
    QRCode.toDataURL(shareUrl, { width: 320, margin: 1, color: { dark: '#17203a' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [shareOpen, shareUrl])

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

  // —— 管理闭环 ——

  const enterVisitor = () => {
    if (editing) finishEditing()
    setVisitor(true)
  }

  const finishEditing = () => {
    setEditing(false)
    setUndo(null)
    persist()
  }

  const deleteLink = (index: number) => {
    const link = links[index]
    setUndo({ link, index })
    setLinks((prev) => prev.filter((_, i) => i !== index))
    timers.current.push(window.setTimeout(() => setUndo(null), 4500))
  }

  const undoDelete = () => {
    if (!undo) return
    setLinks((prev) => {
      const next = [...prev]
      next.splice(Math.min(undo.index, next.length), 0, undo.link)
      return next
    })
    setUndo(null)
  }

  const moveLink = (index: number, dir: -1 | 1) => {
    setLinks((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const refreshData = () => {
    setLinks((prev) => prev.map((l) => ({ ...l, value: bumpValue(l.value) })))
    setFlashAll(true)
    timers.current.push(window.setTimeout(() => setFlashAll(false), 1600))
  }

  // —— 渲染 ——

  return (
    <div className="op-page" style={pageStyle}>
      {visitor && (
        <button className="op-visitor-bar" onClick={() => setVisitor(false)}>
          <span className="op-visitor-dot" />
          正在以访客身份查看 · 点击退出
        </button>
      )}

      {/* 发布态的悬浮管理按钮 */}
      {step === 0 && published && !visitor && (
        <>
          <button className="op-fab op-fab-left" aria-label="访客视角" onClick={enterVisitor}>
            访客视角
          </button>
          <div className="op-fab-right">
            {shareUrl && (
              <button className="op-fab" onClick={() => setShareOpen(true)}>
                分享
              </button>
            )}
            <button
              className="op-fab"
              onClick={() => (editing ? finishEditing() : setEditing(true))}
            >
              {editing ? '完成' : '编辑'}
            </button>
          </div>
        </>
      )}

      {/* ———— 欢迎屏（未发布） ———— */}
      {step === 0 && !published && (
        <div className="op-welcome">
          <p className="op-welcome-eyebrow">VOL.1 — 职场价值特辑</p>
          <h1 className="op-welcome-title">你的职业，一页为证。</h1>
          <p className="op-welcome-sub">贴上链接就好，剩下的交给 AI。</p>
          <button className="op-btn-continue op-welcome-btn" onClick={() => setStep(1)}>
            装订我的一页
          </button>
          <div className="op-welcome-foot">
            <span>ONE PAGE · AI-POWERED LINK IN BIO</span>
          </div>
        </div>
      )}

      {/* ———— 发布态：主页本身 ———— */}
      {step === 0 && published && (
        <div className="ops-column op-home-col">
          <div className="ops-avatar">{avatarChar}</div>
          <h1 className="ops-name">{name}</h1>
          <p className="ops-title">{job}</p>
          {bio && <p className="ops-bio">{bio}</p>}

          {editing && !visitor && (
            <div className="op-module-editbar">
              <button className="op-mini-btn" onClick={refreshData}>
                ⟳ 刷新数据
              </button>
              <button className="op-mini-btn" onClick={() => setSheet({ kind: 'style' })}>
                风格
              </button>
            </div>
          )}

          <div className={editorial ? 'opd-list' : 'ops-links'}>
            {links.map((link, i) =>
              editing && !visitor ? (
                <div className="op-edit-row" key={link.platform}>
                  <button
                    className="op-row-del"
                    aria-label={`删除 ${link.platform}`}
                    onClick={() => deleteLink(i)}
                  >
                    −
                  </button>
                  {editorial ? (
                    <span
                      className={`opd-item op-edit-link${flashAll || flashKey === link.platform ? ' is-flashing' : ''}`}
                    >
                      <EditorialItemContent link={link} />
                    </span>
                  ) : (
                    <span
                      className={`ops-link op-edit-link${flashAll || flashKey === link.platform ? ' is-flashing' : ''}`}
                      style={linkBtnStyle}
                    >
                      <LinkButtonContent link={link} />
                    </span>
                  )}
                  <div className="op-row-move">
                    <button aria-label="上移" disabled={i === 0} onClick={() => moveLink(i, -1)}>
                      ↑
                    </button>
                    <button
                      aria-label="下移"
                      disabled={i === links.length - 1}
                      onClick={() => moveLink(i, 1)}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ) : editorial ? (
                <a
                  key={link.platform}
                  className={`opd-item${justAdded === link.platform ? ' is-entering' : ''}${
                    flashAll || flashKey === link.platform ? ' is-flashing' : ''
                  }`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <EditorialItemContent link={link} />
                </a>
              ) : (
                <a
                  key={link.platform}
                  className={`ops-link${justAdded === link.platform ? ' is-entering' : ''}${
                    flashAll || flashKey === link.platform ? ' is-flashing' : ''
                  }`}
                  style={linkBtnStyle}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LinkButtonContent link={link} />
                </a>
              ),
            )}
            {links.length === 0 && !editing && (
              <p className="ops-empty">还没有链接，点右上角「编辑」添加吧</p>
            )}
            {editing && !visitor && (
              <>
                {editSlots.map((id) => (
                  <LinkInputSlot
                    key={id}
                    placeholder="粘贴你的主页链接，如 dribbble.com/xxx"
                    isDuplicate={isDupPlatform}
                    onResolve={(card) => {
                      setLinks((prev) => [...prev, card])
                      setJustAdded(card.platform)
                      timers.current.push(window.setTimeout(() => setJustAdded(null), 800))
                      setEditSlots((prev) => prev.filter((s) => s !== id))
                    }}
                    onDuplicate={(platform) => {
                      flashPlatform(platform)
                      setEditSlots((prev) => prev.filter((s) => s !== id))
                    }}
                  />
                ))}
                <button
                  className="op-add-row"
                  onClick={() => setEditSlots((prev) => [...prev, ++slotSeq.current])}
                >
                  <span className="op-add-plus">+</span>
                  添加链接
                </button>
              </>
            )}
          </div>

          <p className="ops-foot">数据均来自平台直采 · 刚刚更新</p>
          {!visitor && (
            <button className="op-reset-link" onClick={resetDemo}>
              重置演示
            </button>
          )}
        </div>
      )}

      {/* ———— 向导第 1-3 步（壁纸全屏打底） ———— */}
      {(step === 1 || step === 2 || step === 3) && (
        <div className="op-col">
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
                介绍一下<em>你自己</em>
              </h2>
              <p className="op-wiz-sub">这些信息会展示在你的主页顶部</p>
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
              <p className="op-wiz-sub">贴上主页链接，AI 自动读取平台数据生成条目</p>
              <div className="op-slots">
                {slots.map((slot, i) =>
                  slot.card ? (
                    <div className="op-slot-done" key={slot.id}>
                      {editorial ? (
                        <span
                          className={`opd-item op-slot-link${
                            flashKey === slot.card.platform ? ' is-flashing' : ''
                          }`}
                        >
                          <EditorialItemContent link={slot.card} />
                        </span>
                      ) : (
                        <span
                          className={`ops-link op-slot-link${
                            flashKey === slot.card.platform ? ' is-flashing' : ''
                          }`}
                          style={linkBtnStyle}
                        >
                          <LinkButtonContent link={slot.card} />
                        </span>
                      )}
                    </div>
                  ) : (
                    <LinkInputSlot
                      key={slot.id}
                      placeholder={persona.placeholders[i] ?? '粘贴你的主页链接'}
                      isDuplicate={isDupPlatform}
                      onResolve={(card) =>
                        setSlots((prev) =>
                          prev.map((s) => (s.id === slot.id ? { ...s, card } : s)),
                        )
                      }
                      onDuplicate={flashPlatform}
                    />
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
                  继续{wizardLinks.length > 0 && `（已添加 ${wizardLinks.length} 条）`}
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
              <p className="op-wiz-sub">页面背景就是你的预览，所见即所得</p>

              <StylePicker
                wallpaperId={wallpaperId}
                setWallpaperId={setWallpaperId}
                buttonStyle={buttonStyle}
                setButtonStyle={setButtonStyle}
                buttonColor={buttonColor}
                setButtonColor={setButtonColor}
                styleTab={styleTab}
                setStyleTab={setStyleTab}
              />

              <div className="op-wiz-actions">
                <button className="op-btn-continue" onClick={publish}>
                  发布我的 One Page
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 撤销删除提示 */}
      {undo && (
        <div className="op-undo-toast">
          已删除 {undo.link.platform}
          <button onClick={undoDelete}>撤销</button>
        </div>
      )}

      {/* 分享弹层 */}
      {shareOpen && (
        <div className="op-modal-mask" onClick={() => setShareOpen(false)}>
          <div className="op-share-modal" onClick={(e) => e.stopPropagation()}>
            <button className="op-modal-close" aria-label="关闭" onClick={() => setShareOpen(false)}>
              ✕
            </button>
            <h3 className="op-share-modal-title">你的 One Page 已上线</h3>
            {qr ? (
              <img className="op-share-qr" src={qr} alt="分享二维码" />
            ) : (
              <div className="op-share-qr op-share-qr-loading">生成中…</div>
            )}
            <p className="op-snapshot-note">链接内容为此刻的快照，主页数据可实时更新</p>
            <p className="op-share-url">{shareUrl}</p>
            <div className="op-share-actions">
              <button className="op-btn-continue op-btn-copy" onClick={copyLink}>
                {copied ? '✓ 已复制' : '复制链接'}
              </button>
              <a className="op-btn-open" href={shareUrl} target="_blank" rel="noopener noreferrer">
                打开看看 →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 底部弹层：风格 */}
      {sheet && (
        <div className="op-sheet-mask" onClick={() => setSheet(null)}>
          <div className="op-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="op-sheet-grabber" />

            {sheet.kind === 'style' && (
              <>
                <h3 className="op-sheet-title">风格</h3>
                <StylePreviewCompact
                  wallpaper={wallpaper}
                  linkBtnStyle={linkBtnStyle}
                  avatarChar={avatarChar}
                  name={name}
                  links={links}
                />
                <StylePicker
                  wallpaperId={wallpaperId}
                  setWallpaperId={setWallpaperId}
                  buttonStyle={buttonStyle}
                  setButtonStyle={setButtonStyle}
                  buttonColor={buttonColor}
                  setButtonColor={setButtonColor}
                  styleTab={styleTab}
                  setStyleTab={setStyleTab}
                />
                <div className="op-wiz-actions">
                  <button className="op-btn-continue op-sheet-confirm" onClick={() => setSheet(null)}>
                    完成
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** 风格弹层里的紧凑预览（白底弹层上需要一块壁纸色示意） */
function StylePreviewCompact(props: {
  wallpaper: Wallpaper
  linkBtnStyle: CSSProperties
  avatarChar: string
  name: string
  links: OnePageLink[]
}) {
  return (
    <div className="op-style-preview is-compact" style={{ background: props.wallpaper.bg }}>
      <div className="op-style-avatar">{props.avatarChar}</div>
      <p className="op-style-name" style={{ color: props.wallpaper.text }}>
        {props.name}
      </p>
      <div className="op-style-links">
        {props.links.slice(0, 2).map((link) => (
          <span key={link.platform} className="op-style-link" style={props.linkBtnStyle}>
            <strong>{link.platform}</strong>
            <span>
              {link.value}
              {link.unit ?? ''} · {link.metric}
            </span>
          </span>
        ))}
        {props.links.length === 0 && (
          <p className="op-style-empty" style={{ color: props.wallpaper.text }}>
            还没有链接
          </p>
        )}
      </div>
    </div>
  )
}

/** 壁纸 + 按钮样式选择器（向导第 3 步与风格弹层共用） */
function StylePicker(props: {
  wallpaperId: string
  setWallpaperId: (id: string) => void
  buttonStyle: ButtonStyleId
  setButtonStyle: (s: ButtonStyleId) => void
  buttonColor: ButtonColorId
  setButtonColor: (c: ButtonColorId) => void
  styleTab: 'wallpaper' | 'button'
  setStyleTab: (t: 'wallpaper' | 'button') => void
}) {
  return (
    <>
      <div className="op-tabs">
        <button
          className={`op-tab${props.styleTab === 'wallpaper' ? ' is-active' : ''}`}
          onClick={() => props.setStyleTab('wallpaper')}
        >
          壁纸
        </button>
        <button
          className={`op-tab${props.styleTab === 'button' ? ' is-active' : ''}`}
          onClick={() => props.setStyleTab('button')}
        >
          按钮
        </button>
      </div>

      {props.styleTab === 'wallpaper' && (
        <div className="op-swatches">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              className={`op-swatch${w.id === props.wallpaperId ? ' is-active' : ''}`}
              style={{ background: w.bg }}
              title={w.name}
              onClick={() => props.setWallpaperId(w.id)}
            >
              {w.id === props.wallpaperId && <span style={{ color: w.text }}>✓</span>}
            </button>
          ))}
        </div>
      )}

      {props.styleTab === 'button' && (
        <>
          <div className="op-btnstyles">
            {BUTTON_STYLES.map((b) => (
              <button
                key={b.id}
                className={`op-btnstyle${b.id === props.buttonStyle ? ' is-active' : ''}`}
                onClick={() => props.setButtonStyle(b.id)}
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
                className={`op-btncolor${c.id === props.buttonColor ? ' is-active' : ''}`}
                onClick={() => props.setButtonColor(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
