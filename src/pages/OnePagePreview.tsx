import { useEffect, useRef, useState, type CSSProperties } from 'react'
import QRCode from 'qrcode'
import { PlatformIcon } from '../components/PlatformIcon'
import { ProfileEditIcon, ProfileShareIcon } from '../components/icons'
import { savePage } from '../pageRepository'
import { pageUrl } from '../router'
import { fetchPlatformMetrics, fetchGenericSite, fetchFailureMessage, type FetchedMetrics } from '../dataFetch'
import {
  BUTTON_STYLES,
  PAGE_TEMPLATES,
  WALLPAPERS,
  resolveButtonColors,
  wallpaperById,
  type ButtonColorId,
  type ButtonStyleId,
  type OnePageLink,
  type OnePageShare,
  type Wallpaper,
} from '../onepage'
import { EditorialItemContent, ProfileAvatar } from './OnePageShared'
import './onepage-preview.css'
import './onepage-shared.css'
import './onepage-customize.css'
import './onepage-interface.css'

type PersonaId = 'designer' | 'developer'

function EditorActionIcon({ kind }: { kind: 'refresh' | 'style' | 'up' | 'down' | 'delete' }) {
  const paths = {
    refresh: 'M20 7v5h-5M20 12a8 8 0 1 0-2.3 5.7',
    style: 'M4 7h16M4 17h16M9 4v6M15 14v6',
    up: 'M12 19V5m-5 5 5-5 5 5',
    down: 'M12 5v14m-5-5 5 5 5-5',
    delete: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
  }
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>
}

function LinkEditMenu({ platform, first, last, onMove, onDelete }: {
  platform: string; first: boolean; last: boolean
  onMove: (direction: -1 | 1) => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    root.current?.querySelector<HTMLButtonElement>('.op-link-edit-actions button:not(:disabled)')?.focus()
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  const act = (action: () => void) => { setOpen(false); action(); trigger.current?.focus() }
  return <div className="op-link-edit-menu" ref={root}>
    <button ref={trigger} className="op-link-edit-more" aria-label={`${platform} 更多操作`} aria-expanded={open} onClick={() => setOpen(!open)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
    </button>
    {open && <div className="op-link-edit-actions" role="group" aria-label={`${platform} 链接操作`}>
      <button disabled={first} onClick={() => act(() => onMove(-1))}><EditorActionIcon kind="up" />上移</button>
      <button disabled={last} onClick={() => act(() => onMove(1))}><EditorActionIcon kind="down" />下移</button>
      <button className="op-link-edit-delete" onClick={() => act(onDelete)}><EditorActionIcon kind="delete" />移除链接</button>
    </div>}
  </div>
}

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

/** 已知平台的身份信息（名称/图标/品牌色）；数据全部实时抓取，抓不到显示「已收录」 */
const KNOWN_PLATFORMS: Record<string, { platform: string; badge: string; accent: string }> = {
  'dribbble.com': { platform: 'Dribbble', badge: 'Dr', accent: '#ea4c89' },
  'behance.net': { platform: 'Behance', badge: 'Be', accent: '#1769ff' },
  'zcool.com.cn': { platform: '站酷', badge: '站', accent: '#ff552e' },
  'github.com': { platform: 'GitHub', badge: 'GH', accent: '#24292f' },
  'juejin.cn': { platform: '掘金', badge: '掘', accent: '#1e80ff' },
  'stackoverflow.com': { platform: 'Stack Overflow', badge: 'SO', accent: '#f48024' },
  'huaban.com': { platform: '花瓣网', badge: '瓣', accent: '#e60023' },
}

type PlatformIdentity = { platform: string; badge: string; accent: string }

type Detected =
  | { kind: 'known'; card: PlatformIdentity }
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

/** 抓取完成前的占位卡片：没有任何数字，只表达「已收录」 */
function cardFromDetected(detected: Detected, url: string): OnePageLink {
  return detected.kind === 'known'
    ? {
        ...detected.card,
        metric: '主页链接',
        value: '✓',
        insight: `已收录「${detected.card.platform} 主页」`,
        generic: true,
        url,
      }
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

/** 占位卡片 + 真实抓取结果 → 正式条目；抓到 ✓（页面可读但无数字）维持「已收录」 */
function cardWithMetrics(
  detected: Detected,
  url: string,
  metrics: FetchedMetrics,
): OnePageLink {
  const base = cardFromDetected(detected, url)
  return {
    ...base,
    metric: metrics.metric,
    value: metrics.value,
    unit: metrics.unit,
    insight: metrics.insight || base.insight,
    source: metrics.source,
    generic: metrics.value === '✓',
  }
}

type LinkSlot = { id: number; card: OnePageLink | null }

/** 内联读取步骤（宋体斜体小字，逐行浮现） */
const READ_STEPS = ['正在打开主页…', '正在读取平台数据…', '正在核实数据…', '✓ 读取完成']

/**
 * 链接输入槽：粘贴后去抖 600ms 自动触发；手动输入按 Enter 才开始读取，
 * 期间并行拉取真实数据（dataFetch 三轨制），完成后经 onResolve 交给父级变条目；
 * 重复平台走 onDuplicate 并自我清空。每个槽位独立持有自己的计时器，多槽并行互不阻塞。
 */
function LinkInputSlot(props: {
  placeholder: string
  isDuplicate: (platform: string) => boolean
  onResolve: (card: OnePageLink) => void
  onDuplicate: (platform: string) => void
  /** 重复平台重新读到真实数据时，更新已有条目 */
  onRefresh?: (card: OnePageLink) => void
  /** 读取开始/结束时上报，父级据此禁用「继续」（跳过保持可点） */
  onReadingChange?: (reading: boolean) => void
}) {
  const [value, setValue] = useState('')
  const [reading, setReading] = useState(false)
  const [failure, setFailure] = useState('')
  const [stepIdx, setStepIdx] = useState(0)
  const [finalText, setFinalText] = useState(READ_STEPS[3])
  const debounceRef = useRef<number | null>(null)
  const stepTimers = useRef<number[]>([])
  const readingChangeRef = useRef(props.onReadingChange)
  readingChangeRef.current = props.onReadingChange

  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      stepTimers.current.forEach((t) => window.clearTimeout(t))
      readingChangeRef.current?.(false)
    },
    [],
  )

  const start = (v: string) => {
    const detected = detectUrl(v)
    if (!detected) return
    const url = normalizeUrl(v)
    const dup = detected.kind === 'known' && props.isDuplicate(detected.card.platform)
    setReading(true)
    setFailure('')
    props.onReadingChange?.(true)
    setStepIdx(0)
    stepTimers.current.push(window.setTimeout(() => setStepIdx(1), 900))
    stepTimers.current.push(window.setTimeout(() => setStepIdx(2), 1800))

    // 真实数据获取与步骤动画并行；两者都就绪才进入完成步（重复平台也真抓，刷新旧条目）
    const minTime = new Promise((r) => stepTimers.current.push(window.setTimeout(r, 2700)))
    let failureReason = 'fetch-failed'
    const onFailure = (reason: string) => { failureReason = reason }
    const fetchP =
      detected.kind === 'known'
        ? fetchPlatformMetrics(detected.card.platform, url, onFailure)
        : fetchGenericSite(url, onFailure)
    void Promise.all([minTime, fetchP]).then(([, metrics]) => {
      if (!metrics) {
        setFailure(fetchFailureMessage(failureReason))
        setReading(false)
        props.onReadingChange?.(false)
        return
      }
      setFinalText(dup ? (metrics ? '✓ 已刷新最新数据' : '✓ 已在列表中') : READ_STEPS[3])
      setStepIdx(3)
      stepTimers.current.push(
        window.setTimeout(() => {
          if (dup && detected.kind === 'known') {
            if (metrics) props.onRefresh?.(cardWithMetrics(detected, url, metrics))
            props.onDuplicate(detected.card.platform)
            setValue('')
            setReading(false)
            props.onReadingChange?.(false)
            return
          }
          // 抓不到真实数据就保留「已收录」占位，绝不编造数字
          const card = metrics ? cardWithMetrics(detected, url, metrics) : cardFromDetected(detected, url)
          props.onResolve(card)
        }, 700),
      )
    })
  }

  const scheduleStart = (v: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => start(v), 600)
  }

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').trim()
    if (!pasted) return
    event.preventDefault()
    setValue(pasted)
    scheduleStart(pasted)
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
          onChange={(e) => setValue(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (debounceRef.current) window.clearTimeout(debounceRef.current)
              start(value)
            }
          }}
        />
        <span className="op-slot-icon" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </span>
        {reading && (
          <div className="op-slot-steps">
            {READ_STEPS.slice(0, stepIdx + 1).map((text, i) => (
              <span key={i} className={`op-slot-step${i === 3 ? ' is-final' : ''}`}>
                {i === 3 ? finalText : text}
              </span>
            ))}
          </div>
        )}
      </div>
      {invalid && <p className="op-slot-error">这看起来不是一个链接</p>}
      {failure && !reading && (
        <div role="status" aria-live="polite">
          <p className="op-slot-error">{failure}</p>
          <button type="button" className="op-mini-btn" onClick={() => start(value)}>重试读取</button>
          <button type="button" className="op-mini-btn" onClick={() => {
            const detected = detectUrl(value)
            if (!detected) return
            if (detected.kind === 'known' && props.isDuplicate(detected.card.platform)) {
              props.onDuplicate(detected.card.platform)
              setValue('')
              setFailure('')
              return
            }
            props.onResolve(cardFromDetected(detected, normalizeUrl(value)))
          }}>先保存链接</button>
        </div>
      )}
    </div>
  )
}

function CompletedLinkSlot(props: {
  card: OnePageLink
  linkBtnStyle: CSSProperties
  flashing: boolean
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className={`op-slot-done${menuOpen ? ' is-menu-open' : ''}`}>
      <span
        className={`ops-link op-slot-link${props.flashing ? ' is-flashing' : ''}`}
        style={props.linkBtnStyle}
      >
        <LinkButtonContent link={props.card} />
        <button
          type="button"
          className="op-link-menu-trigger"
          aria-label="打开链接操作菜单"
          aria-expanded={menuOpen}
          onClick={(event) => {
            event.stopPropagation()
            setMenuOpen((open) => !open)
          }}
        >
          <span aria-hidden="true">⋮</span>
        </button>
        {menuOpen && (
          <div className="op-link-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                props.onDelete()
              }}
            >
              删除链接
            </button>
          </div>
        )}
      </span>
    </div>
  )
}

type PublishedState = {
  name: string
  avatarImage?: string
  job: string
  bio: string
  links: OnePageLink[]
  wallpaperId: string
  buttonStyle: ButtonStyleId
  buttonColor: ButtonColorId
  shareUrl: string
  /** 旧存档可能没有；首次加载时补发 */
  slug?: string
  /** Private editing capability. Never included in the public URL or payload. */
  editToken?: string
}

const STORAGE_KEY = 'onepage.published.v1'
const DRAFT_KEY = 'onepage.draft.v1'

function loadPublished(key = STORAGE_KEY): PublishedState | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw) as PublishedState
    return Array.isArray(data.links) ? data : null
  } catch {
    return null
  }
}

type Sheet =
  | { kind: 'style' }
  | { kind: 'profile' }
  | null

function ProfileEditor({ name, job, bio, onApply, onClose }: {
  name: string; job: string; bio: string
  onApply: (name: string, job: string, bio: string) => void; onClose: () => void
}) {
  const [draftName, setDraftName] = useState(name)
  const [draftJob, setDraftJob] = useState(job)
  const [draftBio, setDraftBio] = useState(bio)
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    form.current?.querySelector('input')?.focus()
    return () => previous?.focus()
  }, [])
  return <form ref={form} className="op-profile-editor" onSubmit={(event) => { event.preventDefault(); onApply(draftName.trim(), draftJob.trim(), draftBio.trim()) }} onKeyDown={(event) => {
    if (event.key === 'Escape') onClose()
    if (event.key !== 'Tab') return
    const controls = [...(form.current?.querySelectorAll<HTMLElement>('input, textarea, button:not(:disabled)') ?? [])]
    const first = controls[0], last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }}>
    <h3 className="op-sheet-title" id="op-profile-editor-title">编辑个人资料</h3>
    <div className="op-form">
      <label className="op-field"><span className="op-field-label">姓名</span><input required maxLength={80} className="op-field-input" value={draftName} onChange={(event) => setDraftName(event.target.value)} /></label>
      <label className="op-field"><span className="op-field-label">职位</span><input maxLength={160} className="op-field-input" value={draftJob} onChange={(event) => setDraftJob(event.target.value)} /></label>
      <label className="op-field"><span className="op-field-label">一句话简介</span><textarea maxLength={800} rows={3} className="op-field-input op-field-textarea" value={draftBio} onChange={(event) => setDraftBio(event.target.value)} /></label>
    </div>
    <button className="op-btn-continue" disabled={!draftName.trim()} type="submit">确认修改</button>
    <button className="op-btn-skip" type="button" onClick={onClose}>取消</button>
  </form>
}

/** 主页条目按钮的内容（左侧图标 / 中间平台名 / 右侧数字），<a> 或 <span> 均可套用 */
function LinkButtonContent({ link }: { link: OnePageLink }) {
  return (
    <>
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
    </>
  )
}

export function OnePagePreview() {
  const [initial] = useState(() => loadPublished() ?? loadPublished(DRAFT_KEY))
  const persona = PERSONAS[0]

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [published, setPublished] = useState(() => loadPublished() !== null)

  // 资料
  const [name, setName] = useState(initial?.name ?? persona.name)
  const [job, setJob] = useState(initial?.job ?? persona.job)
  const [bio, setBio] = useState(initial?.bio ?? persona.bio)
  const [avatarImage, setAvatarImage] = useState(initial?.avatarImage ?? '')
  const [avatarError, setAvatarError] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)
  const avatarInput = useRef<HTMLInputElement>(null)

  const changeAvatar = async (file?: File) => {
    if (!file) return
    setAvatarError('')
    setAvatarLoading(true)
    let objectUrl = ''
    try {
      if (!file.type.startsWith('image/')) throw new Error('请选择图片文件')
      objectUrl = URL.createObjectURL(file)
      const image = new Image()
      image.src = objectUrl
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 128
      const context = canvas.getContext('2d')
      if (!context) throw new Error('暂时无法处理图片，请重试')
      const size = Math.min(image.naturalWidth, image.naturalHeight)
      context.fillStyle = '#fff8eb'
      context.fillRect(0, 0, 128, 128)
      context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 128, 128)
      setAvatarImage(canvas.toDataURL('image/jpeg', 0.7))
    } catch {
      setAvatarError('图片无法读取，请换一张 JPG、PNG 或 WebP 图片')
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setAvatarLoading(false)
      if (avatarInput.current) avatarInput.current.value = ''
    }
  }

  // 已发布条目（管理闭环的工作数据）
  const [links, setLinks] = useState<OnePageLink[]>(initial?.links ?? [])

  // 向导第 2 步的输入槽
  const [slots, setSlots] = useState<LinkSlot[]>(() => loadPublished() ? [] : (initial?.links ?? []).map((card, id) => ({ id: id + 1, card })))
  const slotSeq = useRef(slots.length)
  // 正在读取数据的槽位；非空时「继续」禁用（「跳过」保持可点）
  const [readingSlots, setReadingSlots] = useState<ReadonlySet<number>>(new Set())
  const setSlotReading = (id: number, reading: boolean) =>
    setReadingSlots((prev) => {
      if (reading === prev.has(id)) return prev
      const next = new Set(prev)
      if (reading) next.add(id)
      else next.delete(id)
      return next
    })

  // 风格
  const [wallpaperId, setWallpaperId] = useState(initial?.wallpaperId ?? 'cream')
  const [buttonStyle, setButtonStyle] = useState<ButtonStyleId>(initial?.buttonStyle ?? 'pill')
  const [buttonColor, setButtonColor] = useState<ButtonColorId>(initial?.buttonColor ?? 'wallpaper')
  const [styleTab, setStyleTab] = useState<'wallpaper' | 'button'>('wallpaper')

  // 分享
  const [shareUrl, setShareUrl] = useState(initial?.shareUrl ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [editToken, setEditToken] = useState(initial?.editToken ?? '')
  const credential = useRef(initial?.editToken && initial.slug ? { slug: initial.slug, editToken: initial.editToken } : undefined)
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const pendingSaves = useRef(0)
  const saveGeneration = useRef(0)
  const lastSaved = useRef('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [syncRetry, setSyncRetry] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [qr, setQr] = useState('')
  const [showShareQr, setShowShareQr] = useState(false)
  const [qrFailed, setQrFailed] = useState(false)
  const sharePreviewCanvas = useRef<HTMLDivElement>(null)
  const [previewOverflow, setPreviewOverflow] = useState(false)
  const [copied, setCopied] = useState(false)

  // 管理闭环
  const [editing, setEditing] = useState(false)
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const [flashAll, setFlashAll] = useState(false)
  const [undo, setUndo] = useState<{ link: OnePageLink; index: number } | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [editSlots, setEditSlots] = useState<number[]>([])
  const [refreshing, setRefreshing] = useState(false)

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
  const editorial = false
  const linkBtnStyle: CSSProperties = {
    background: btnColors.bg,
    color: btnColors.text,
    borderRadius: radius,
    borderColor: btnColors.border,
    backdropFilter: buttonColor === 'wallpaper' && wallpaper.followBorder ? 'blur(8px)' : undefined,
    WebkitBackdropFilter: buttonColor === 'wallpaper' && wallpaper.followBorder ? 'blur(8px)' : undefined,
  }

  const canvasWallpaper = !published && step < 3 ? wallpaperById('cream') : wallpaper
  const pageStyle = {
    background: canvasWallpaper.bg,
    color: canvasWallpaper.text,
    '--wiz-text': canvasWallpaper.text,
    '--profile-canvas': canvasWallpaper.canvas ?? canvasWallpaper.bg,
    '--wiz-btn-bg': canvasWallpaper.dark ? '#ffffff' : '#1a1a18',
    '--wiz-btn-text': '#ffffff',
    '--profile-subtext': wallpaperId === 'cream' ? '#383A4C' : canvasWallpaper.text,
    '--profile-footer-text': wallpaperId === 'cream' ? '#7d7972' : canvasWallpaper.text,
    '--profile-metric-text': wallpaperId === 'cream' ? '#6E727A' : btnColors.text,
    '--profile-control-text': wallpaperId === 'cream'
      ? '#514D45'
      : `color-mix(in srgb, ${canvasWallpaper.text} 82%, ${canvasWallpaper.canvas ?? canvasWallpaper.bg})`,
    '--profile-control-bg': wallpaperId === 'cream'
      ? '#F7F0DE'
      : `color-mix(in srgb, ${canvasWallpaper.text} 5%, transparent)`,
  } as CSSProperties

  const persist = (next?: Partial<PublishedState>) => {
    const data: PublishedState = {
      name,
      avatarImage,
      job,
      bio,
      links,
      wallpaperId,
      buttonStyle,
      buttonColor,
      shareUrl,
      slug,
      editToken,
      ...next,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  const resetDemo = () => {
    saveGeneration.current += 1
    credential.current = undefined
    lastSaved.current = ''
    setEditToken('')
    setSaveError('')
    setSaving(false)
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(DRAFT_KEY)
    setPublished(false)
    setStep(0)
    setName(persona.name)
    setJob(persona.job)
    setBio(persona.bio)
    setAvatarImage('')
    setAvatarError('')
    setLinks([])
    setSlots([])
    setWallpaperId('cream')
    setButtonStyle('pill')
    setButtonColor('wallpaper')
    setShareUrl('')
    setSlug('')
    setShareOpen(false)
    setEditing(false)
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

  /** 重复粘贴某平台时，用新抓到的真实数据更新已有条目（向导槽位 + 已发布条目一起查） */
  const refreshPlatform = (card: OnePageLink) => {
    flashPlatform(card.platform)
    setSlots((prev) =>
      prev.map((s) => (s.card?.platform === card.platform ? { ...s, card } : s)),
    )
    setLinks((prev) => prev.map((l) => (l.platform === card.platform ? card : l)))
  }

  const pageData = (s: string, linkList: OnePageLink[]): OnePageShare => {
    return {
      kind: 'onepage',
      slug: s,
      name,
      title: job,
      bio,
      avatar: name.trim()[0] ?? persona.avatar,
      avatarImage: avatarImage || undefined,
      wallpaper: wallpaperId,
      buttonStyle,
      buttonColor,
      links: linkList,
    }
  }

  const saveCloud = (payload: OnePageShare) => {
    const generation = saveGeneration.current
    setSaving(true)
    pendingSaves.current += 1
    setSaveError('')
    const task = saveQueue.current.catch(() => undefined).then(async () => {
      if (generation !== saveGeneration.current) return false
      const saved = await savePage(payload, credential.current)
      if (generation !== saveGeneration.current) return false
      credential.current = { slug: saved.slug, editToken: saved.editToken }
      lastSaved.current = JSON.stringify(saved.data)
      const url = pageUrl(saved.slug)
      setSlug(saved.slug)
      setEditToken(saved.editToken)
      setShareUrl(url)
      if (saved.data.avatarImage !== payload.avatarImage) setAvatarImage(saved.data.avatarImage ?? '')
      persist({ slug: saved.slug, editToken: saved.editToken, shareUrl: url,
        links: saved.data.links, avatarImage: saved.data.avatarImage ?? '' })
      return true
    }).catch((error: unknown) => {
      if (generation === saveGeneration.current) {
        setSaveError(error instanceof Error && error.message === 'edit-not-allowed'
          ? '编辑凭证无效，无法修改这个页面'
          : '暂时无法保存到云端，内容已保留，请重试')
      }
      return false
    }).finally(() => {
      pendingSaves.current -= 1
      if (!pendingSaves.current) setSaving(false)
    })
    saveQueue.current = task
    return task
  }

  const publish = async () => {
    if (saving) return
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, job, bio, avatarImage,
      links: wizardLinks, wallpaperId, buttonStyle, buttonColor, shareUrl: '', slug, editToken }))
    if (!await saveCloud(pageData(slug, wizardLinks))) return
    window.localStorage.removeItem(DRAFT_KEY)
    setLinks(wizardLinks)
    setPublished(true)
    setStep(0)
    setShareOpen(true)
  }

  // Preserve local changes immediately. Cloud updates are serialized and
  // debounced, so an earlier request cannot overwrite a later edit.
  useEffect(() => {
    if (!published) return
    persist()
    if (editing) return
    const payload = pageData(slug, links)
    if (JSON.stringify(payload) === lastSaved.current) return
    const timer = window.setTimeout(() => { void saveCloud(payload) }, 600)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [published, slug, editToken, name, job, bio, avatarImage, links, wallpaperId, buttonStyle, buttonColor, editing, syncRetry])

  useEffect(() => {
    if (!shareOpen) setShowShareQr(false)
  }, [shareOpen])

  useEffect(() => {
    const canvas = sharePreviewCanvas.current
    if (!canvas) return
    const measure = () => setPreviewOverflow(canvas.scrollHeight > 600)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [shareOpen, showShareQr, name, job, bio, links, avatarImage])

  useEffect(() => {
    if (!shareOpen || !showShareQr || !shareUrl) return
    let cancelled = false
    setQr('')
    setQrFailed(false)
    QRCode.toDataURL(shareUrl, { width: 320, margin: 1, color: { dark: '#17203a' } })
      .then((value) => { if (!cancelled) setQr(value) })
      .catch(() => { if (!cancelled) setQrFailed(true) })
    return () => { cancelled = true }
  }, [shareOpen, showShareQr, shareUrl])

  const copyLink = async () => {
    if (!editToken || saving || saveError) return
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

  /** 刷新数据：每条链接重新真实抓取；抓不到的保留上一次的真实值 */
  const refreshData = async () => {
    if (refreshing) return
    setRefreshing(true)
    setFlashAll(true)
    const next = await Promise.all(
      links.map(async (l) => {
        const metrics = l.generic
          ? await fetchGenericSite(l.url)
          : await fetchPlatformMetrics(l.platform, l.url)
        if (!metrics || metrics.value === '✓') return l
        return {
          ...l,
          metric: metrics.metric,
          value: metrics.value,
          unit: metrics.unit,
          insight: metrics.insight || l.insight,
          source: metrics.source,
          generic: false,
        }
      }),
    )
    setLinks(next)
    setFlashAll(false)
    setRefreshing(false)
  }

  // —— 渲染 ——

  return (
    <div className={`op-page${step === 0 && published ? ' is-published' : ''}${step === 0 && published && editing ? ' is-editing' : ''}`} style={pageStyle}>
      <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void changeAvatar(event.target.files?.[0])} />
      {/* 发布态的悬浮管理按钮 */}
      {step === 0 && published && (
        <>
          <div className="op-fab-right">
            {shareUrl && editToken && (
              <button className="op-fab" aria-label="分享" title="分享" onClick={() => setShareOpen(true)}>
                <ProfileShareIcon />
              </button>
            )}
            <button
              className="op-fab"
              aria-label={editing ? '完成' : '编辑'}
              title={editing ? '完成' : '编辑'}
              onClick={() => (editing ? finishEditing() : setEditing(true))}
            >
              {editing ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <ProfileEditIcon />
              )}
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
          {editing ? (
            <button className="op-avatar-change op-home-avatar-edit" aria-label={avatarLoading ? '头像处理中' : '更换头像'} title="更换头像" disabled={avatarLoading} onClick={() => avatarInput.current?.click()}>
              <ProfileAvatar src={avatarImage} />
              <span className="op-avatar-edit-badge" aria-hidden="true"><ProfileEditIcon /></span>
            </button>
          ) : <ProfileAvatar src={avatarImage} />}
          {avatarError && <p className="op-avatar-error" role="alert">{avatarError}</p>}
          <h1 className="ops-name">{name}</h1>
          <p className="ops-title">{job}</p>
          {bio && <p className="ops-bio">{bio}</p>}

          {editing && (
            <div className="op-module-editbar">
              <button className="op-editor-tool" onClick={() => setSheet({ kind: 'profile' })}><ProfileEditIcon />编辑资料</button>
              <button className="op-editor-tool" disabled={refreshing} onClick={refreshData}>
                <EditorActionIcon kind="refresh" />
                {refreshing ? '读取中…' : '刷新数据'}
              </button>
              <button className="op-editor-tool" onClick={() => setSheet({ kind: 'style' })}>
                <EditorActionIcon kind="style" />
                调整风格
              </button>
            </div>
          )}

          <div className={editorial ? 'opd-list' : 'ops-links'}>
            {links.map((link, i) =>
              editing ? (
                <div className="op-edit-row" key={link.platform} style={{ '--link-control-text': btnColors.text } as CSSProperties}>
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
                  <LinkEditMenu platform={link.platform} first={i === 0} last={i === links.length - 1} onMove={(direction) => moveLink(i, direction)} onDelete={() => deleteLink(i)} />
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
            {editing && (
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
                    onRefresh={refreshPlatform}
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
          {(saving || saveError) && <p className="op-cloud-status" role={saveError ? 'alert' : 'status'}>
            {saving ? '正在保存…' : saveError}
            {saveError && <button onClick={() => setSyncRetry((n) => n + 1)}>重试保存</button>}
          </p>}
          <button className="op-reset-link" onClick={resetDemo}>
            重置演示
          </button>
        </div>
      )}

      {/* ———— 向导第 1-2 步（壁纸全屏打底） ———— */}
      {(step === 1 || step === 2) && (
        <div className={`op-col${step === 1 ? ' op-intro' : ' op-links-step'}`}>
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
              <div className="op-form" role="group" aria-label="个人资料">
                <div className="op-intro-identity">
                  <button className="op-avatar-change op-intro-avatar" aria-label={avatarLoading ? '头像处理中' : '更换头像'} disabled={avatarLoading} onClick={() => avatarInput.current?.click()}>
                    <ProfileAvatar src={avatarImage} />
                    <span className="op-avatar-edit-badge" aria-hidden="true"><ProfileEditIcon /></span>
                  </button>
                  {avatarError && <p className="op-avatar-error" role="alert">{avatarError}</p>}
                </div>
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
              <p className="op-wiz-sub">贴上主页链接，AI 帮你整理成名片</p>
              <div className="op-slots">
                {slots.map((slot, i) =>
                  slot.card ? (
                    editorial ? (
                      <div className="op-slot-done" key={slot.id}>
                        <span
                          className={`opd-item op-slot-link${
                            flashKey === slot.card.platform ? ' is-flashing' : ''
                          }`}
                        >
                          <EditorialItemContent link={slot.card} />
                        </span>
                      </div>
                    ) : (
                      <CompletedLinkSlot
                        key={slot.id}
                        card={slot.card}
                        linkBtnStyle={linkBtnStyle}
                        flashing={flashKey === slot.card.platform}
                        onDelete={() =>
                          setSlots((prev) =>
                            prev.map((s) => (s.id === slot.id ? { ...s, card: null } : s)),
                          )
                        }
                      />
                    )
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
                      onRefresh={refreshPlatform}
                      onReadingChange={(r) => setSlotReading(slot.id, r)}
                    />
                  ),
                )}
              </div>
                <button
                  className="op-add-row op-link-add"
                  onClick={() => setSlots((prev) => [...prev, newSlot()])}
                >
                  <span className="op-add-plus">+</span>
                  添加链接
                </button>
              <div className="op-wiz-actions op-link-actions">
                <button
                  className="op-btn-continue"
                  disabled={readingSlots.size > 0}
                  onClick={() => setStep(3)}
                >
                  继续{wizardLinks.length > 0 && `（已添加 ${wizardLinks.length} 条）`}
                </button>
                <button className="op-btn-skip" onClick={() => setStep(3)}>
                  跳过
                </button>
              </div>
            </>
          )}

        </div>
      )}

      {/* ———— 向导第 3 步：上半手机预览（壁纸打底），下半白色面板 ———— */}
      {step === 3 && (
        <div className="op-style-step">
          <div className="op-style-stage">
            <div className="op-wiz-top">
              <button
                className="op-wiz-back"
                aria-label="返回"
                onClick={() => setStep(2)}
              >
                ←
              </button>
              <div className="op-wiz-progress">
                <div className="op-wiz-progress-fill" style={{ width: '100%' }} />
              </div>
              <span className="op-wiz-count">3 / 3</span>
            </div>
            <PhonePreview
              wallpaper={wallpaper}
              avatarChar={avatarChar}
              avatarImage={avatarImage}
              name={name}
              job={job}
              links={wizardLinks}
              linkBtnStyle={linkBtnStyle}
            />
          </div>

          <div className="op-style-sheet">
            <div className="op-style-sheet-inner">
              <h2 className="op-wiz-title">定制你的风格</h2>

              <StylePicker
                featured
                wallpaper={wallpaper}
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
                {saveError && <p className="op-cloud-status" role="alert">{saveError}</p>}
                <button className="op-btn-continue" disabled={saving || avatarLoading} onClick={() => void publish()}>
                  {saving ? '正在发布…' : '发布我的 One Page'}
                </button>
              </div>
            </div>
          </div>
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
          <div className="op-share-modal" role="dialog" aria-modal="true" aria-labelledby="op-share-title" onClick={(e) => e.stopPropagation()}>
            <button className="op-modal-close" aria-label="关闭" onClick={() => setShareOpen(false)}>
              ✕
            </button>
            <h3 className="op-share-modal-title" id="op-share-title">你的一页已上线</h3>
            <p className="op-share-subtitle">分享你的一页名片</p>
            {showShareQr ? (
              <div className="op-share-qr-panel" aria-live="polite">
                {qr ? <img className="op-share-qr" src={qr} alt="分享二维码" /> : (
                  <p className="op-share-qr-message">{qrFailed ? '链接较长，无法生成二维码，请复制链接分享' : '正在生成二维码…'}</p>
                )}
                {qr && <p>扫码查看我的一页</p>}
              </div>
            ) : (
              <div className={`op-share-preview${previewOverflow ? ' is-overflowing' : ''}`} style={{ background: wallpaper.bg, color: wallpaper.text, '--preview-background': wallpaper.bg } as CSSProperties} aria-label="主页预览">
                <div className="op-share-preview-canvas" ref={sharePreviewCanvas} aria-hidden="true">
                  <div className="ops-column">
                    <ProfileAvatar src={avatarImage} />
                    <h4 className="ops-name">{name}</h4>
                    <p className="ops-title">{job}</p>
                    {bio && <p className="ops-bio">{bio}</p>}
                    <div className="ops-links">
                      {links.map((link) => <div className="ops-link" key={link.platform} style={linkBtnStyle}><LinkButtonContent link={link} /></div>)}
                      {links.length === 0 && <p className="ops-empty">这个页面还没有添加链接</p>}
                    </div>
                    <p className="ops-foot">数据均来自平台直采 · 刚刚更新</p>
                  </div>
                </div>
              </div>
            )}
            <div className="op-share-actions">
              {(saving || saveError) && <p className="op-cloud-status" role="status">{saving ? '正在保存…' : saveError}</p>}
              <button className="op-btn-continue op-btn-copy" disabled={saving || !!saveError} onClick={copyLink}>
                {copied ? '✓ 已复制' : '复制链接'}
              </button>
              <div className="op-share-secondary">
                <button className="op-share-qr-toggle" aria-pressed={showShareQr} onClick={() => setShowShareQr((value) => !value)}>{showShareQr ? '返回预览' : '二维码'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部弹层：风格 */}
      {sheet && (
        <div className="op-sheet-mask" onClick={() => setSheet(null)}>
          <div className="op-sheet" role="dialog" aria-modal="true" aria-label={sheet.kind === 'profile' ? '编辑个人资料' : '调整风格'} onClick={(e) => e.stopPropagation()}>
            <div className="op-sheet-grabber" />

            {sheet.kind === 'profile' && <ProfileEditor name={name} job={job} bio={bio} onClose={() => setSheet(null)} onApply={(nextName, nextJob, nextBio) => { setName(nextName); setJob(nextJob); setBio(nextBio); setSheet(null) }} />}

            {sheet.kind === 'style' && (
              <>
                <h3 className="op-sheet-title">风格</h3>
                <StylePreviewCompact
                  wallpaper={wallpaper}
                  linkBtnStyle={linkBtnStyle}
                  avatarChar={avatarChar}
                  avatarImage={avatarImage}
                  name={name}
                  links={links}
                />
                <StylePicker
                  wallpaper={wallpaper}
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

/**
 * 向导第 3 步的手机预览：实际资料与链接，未添加链接时展示形状示意。
 * 链接横条跟随按钮样式与颜色，换壁纸/按钮即时可见。
 */
function PhonePreview(props: {
  wallpaper: Wallpaper
  avatarImage?: string
  avatarChar: string
  name: string
  job: string
  links: OnePageLink[]
  linkBtnStyle: CSSProperties
}) {
  return (
    <div className="op-phone">
      <div className="op-phone-screen" style={{ background: props.wallpaper.bg, color: props.wallpaper.text }}>
        <div className="op-phone-avatar"><ProfileAvatar src={props.avatarImage} /></div>
        <p className="op-phone-name">{props.name}</p>
        <p className="op-phone-job">{props.job}</p>
        <div className="op-phone-links">
          {[0, 1, 2].map((i) => (
              <span key={i} className="op-phone-link" style={props.linkBtnStyle}>
                <span>{props.links[i]?.platform}</span><span aria-hidden="true">⋮</span>
              </span>
          ))}
        </div>
        <span className="op-phone-signature">Made with One Page</span>
      </div>
    </div>
  )
}

/** 风格弹层里的紧凑预览（白底弹层上需要一块壁纸色示意） */
function StylePreviewCompact(props: {
  wallpaper: Wallpaper
  avatarImage?: string
  linkBtnStyle: CSSProperties
  avatarChar: string
  name: string
  links: OnePageLink[]
}) {
  return (
    <div className="op-style-preview is-compact" style={{ background: props.wallpaper.bg }}>
      <div className="op-style-avatar"><ProfileAvatar src={props.avatarImage} /></div>
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
  featured?: boolean
  wallpaper: Wallpaper
  wallpaperId: string
  setWallpaperId: (id: string) => void
  buttonStyle: ButtonStyleId
  setButtonStyle: (s: ButtonStyleId) => void
  buttonColor: ButtonColorId
  setButtonColor: (c: ButtonColorId) => void
  styleTab: 'wallpaper' | 'button'
  setStyleTab: (t: 'wallpaper' | 'button') => void
}) {
  const [customOpen, setCustomOpen] = useState(props.wallpaper.type === 'photo')
  const templateMode = customOpen && props.styleTab === 'wallpaper'
  const featuredWallpapers = [
    ['cream', '米白'], ['custom:3c4148', '石墨灰'],
    ['custom:927653', '焦糖'], ['custom:30121d', '深酒红'],
    ['custom:f5d3e9', '樱花粉'],
    ['custom:f8d8bd', '蜜桃'], ['custom:ffffff', '纯白'], ['black', '纯黑'],
  ].map(([id, name]) => ({ ...wallpaperById(id), name }))
  const visibleWallpapers = props.featured ? featuredWallpapers : WALLPAPERS.filter((w) => w.type !== 'photo')
  return (
    <>
      {!templateMode && <div className="op-tabs">
        <button
          className={`op-tab${props.styleTab === 'wallpaper' ? ' is-active' : ''}`}
          aria-pressed={props.styleTab === 'wallpaper'}
          onClick={() => props.setStyleTab('wallpaper')}
        >
          壁纸
        </button>
        <button
          className={`op-tab${props.styleTab === 'button' ? ' is-active' : ''}`}
          aria-pressed={props.styleTab === 'button'}
          onClick={() => props.setStyleTab('button')}
        >
          按钮
        </button>
      </div>}

      <div className={props.featured ? 'op-picker-panels' : undefined}>
        <div className="op-picker-panel" hidden={props.styleTab !== 'wallpaper'}>
        {!customOpen && <div className="op-swatches">
          {visibleWallpapers.map((w) => (
            <button
              key={w.id}
              className={`op-swatch${w.id === props.wallpaperId ? ' is-active' : ''}`}
              style={{ background: w.bg }}
              title={w.name}
              aria-label={w.name}
              aria-pressed={w.id === props.wallpaperId}
              onClick={() => props.setWallpaperId(w.id)}
            >
              {w.id === props.wallpaperId && <span style={{ color: w.text }}>✓</span>}
            </button>
          ))}
          <CustomSwatch
            wallpaperId={props.wallpaperId}
            setWallpaperId={props.setWallpaperId}
            presetSelected={visibleWallpapers.some((w) => w.id === props.wallpaperId)}
            expanded={customOpen}
            onClick={() => setCustomOpen((open) => !open)}
          />
        </div>}
        {customOpen && <div className="op-custom-wallpapers">
          <div className="op-custom-heading"><button className="op-template-back" type="button" onClick={() => setCustomOpen(false)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>返回基础色</button><span>选一个喜欢的卡片</span></div>
          <div className="op-template-rail" role="group" aria-label="选一个喜欢的卡片">
            {PAGE_TEMPLATES.map((preset) => {
              const template = wallpaperById(preset.wallpaper)
              const selected = props.wallpaperId === preset.wallpaper && props.buttonStyle === preset.buttonStyle && props.buttonColor === 'wallpaper'
              return <button type="button" className={`op-wallpaper-template${selected ? ' is-active' : ''}`} key={preset.wallpaper} aria-pressed={selected} onClick={() => { props.setWallpaperId(preset.wallpaper); props.setButtonStyle(preset.buttonStyle); props.setButtonColor('wallpaper') }}>
                <span className="op-template-preview" style={{ background: template.bg, color: template.text }} aria-hidden="true"><img src="/onepage-design/avatar-photo.jpg" alt="" /><b>你的名字</b><span className="op-template-bio-line" />{[0, 1, 2].map((n) => <em key={n} style={{ background: template.followBtn, color: template.followText, border: `1px solid ${template.followBorder ?? 'transparent'}`, backdropFilter: template.followBorder ? 'blur(4px)' : undefined, WebkitBackdropFilter: template.followBorder ? 'blur(4px)' : undefined, borderRadius: preset.buttonStyle === 'pill' ? '999px' : '5px' }}>主页链接</em>)}</span>
                <span>{preset.name}</span><small className="op-template-caption">{preset.description}</small>
              </button>
            })}
          </div>
        </div>}
        </div>

        <div className="op-picker-panel" hidden={props.styleTab !== 'button'}>
          <div className="op-btnstyles">
            {BUTTON_STYLES.map((b) => (
              <button
                key={b.id}
                className={`op-btnstyle${b.id === props.buttonStyle ? ' is-active' : ''}`}
                aria-pressed={b.id === props.buttonStyle}
                onClick={() => props.setButtonStyle(b.id)}
              >
                <span
                  className="op-btnstyle-demo"
                  style={{
                    borderRadius: b.radius,
                    background: resolveButtonColors(props.wallpaper, props.buttonColor).bg,
                    color: resolveButtonColors(props.wallpaper, props.buttonColor).text,
                    borderColor: resolveButtonColors(props.wallpaper, props.buttonColor).border,
                  }}
                >{props.featured ? b.name : null}</span>
                {!props.featured && b.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/** Open the curated page templates. */
function CustomSwatch(props: { wallpaperId: string; setWallpaperId: (id: string) => void; presetSelected?: boolean; expanded: boolean; onClick: () => void }) {
  const isCustom = !props.presetSelected
  return (
    <button
      type="button"
      className={`op-swatch op-swatch-custom op-custom-entry${isCustom ? ' is-active' : ''}`}
      aria-expanded={props.expanded}
      onClick={props.onClick}
    >
      <span aria-hidden="true">+</span><span>模板 / 自定义</span>
    </button>
  )
}
