import type { CSSProperties } from 'react'
import type {
  ContactItem,
  ExperienceItem,
  ModuleConfig,
  PageConfig,
  StatusData,
  StatusMode,
  WorkItem,
} from '../types'
import { getTemplate } from '../templates'
import { CONTACT_ICONS, CONTACT_LABELS, LinkIcon } from './icons'

/**
 * 渲染引擎：PageConfig JSON → 完整聚合页。
 * 模板 style 映射为 CSS variables（--yy-*），styleOverrides 在其上覆盖。
 */

const STATUS_PRESETS: Record<StatusMode, { label: string; tone: string }> = {
  looking: { label: '正在看机会', tone: '#22c55e' },
  open: { label: '开放合作', tone: '#3b82f6' },
  busy: { label: '勿扰', tone: '#f59e0b' },
}

function items<T>(m: ModuleConfig): T[] {
  const v = m.data.items
  return Array.isArray(v) ? (v as T[]) : []
}

function HeaderModule({ config }: { config: PageConfig }) {
  const { name, title, company, bio, avatarUrl } = config.profile
  return (
    <header className="yy-header">
      {avatarUrl ? (
        <img className="yy-avatar" src={avatarUrl} alt={name} />
      ) : (
        <div className="yy-avatar yy-avatar-fallback">{name.slice(0, 1) || '一'}</div>
      )}
      <h1 className="yy-name">{name}</h1>
      {(title || company) && (
        <p className="yy-titleline">
          {title}
          {title && company && <span className="yy-at"> @ </span>}
          {company}
        </p>
      )}
      {bio && <p className="yy-bio">{bio}</p>}
    </header>
  )
}

function StatusModule({ config, m }: { config: PageConfig; m: ModuleConfig }) {
  void config
  const data = m.data as unknown as StatusData
  const preset = STATUS_PRESETS[data.mode] ?? STATUS_PRESETS.open
  return (
    <div className="yy-status-row">
      <span className="yy-status">
        <i className="yy-status-dot" style={{ background: preset.tone }} />
        {data.label ?? preset.label}
      </span>
    </div>
  )
}

function ContactsModule({ m }: { m: ModuleConfig }) {
  const list = items<ContactItem>(m)
  if (list.length === 0) return null
  return (
    <div className="yy-contacts">
      {list.map((c, i) => {
        const Icon = CONTACT_ICONS[c.type]
        const href =
          c.type === 'email' ? `mailto:${c.value}` : c.type === 'phone' ? `tel:${c.value}` : undefined
        const inner = (
          <>
            {Icon && <Icon />}
            <span className="yy-contact-label">{CONTACT_LABELS[c.type] ?? c.type}</span>
          </>
        )
        return href ? (
          <a key={i} className="yy-contact" href={href} title={c.value}>
            {inner}
          </a>
        ) : (
          <span key={i} className="yy-contact" title={c.value}>
            {inner}
          </span>
        )
      })}
    </div>
  )
}

function ExperienceModule({ m }: { m: ModuleConfig }) {
  const list = items<ExperienceItem>(m)
  if (list.length === 0) return null
  return (
    <section className="yy-card">
      <h2 className="yy-card-title">职业经历</h2>
      <ul className="yy-exp-list">
        {list.map((e, i) => (
          <li key={i} className="yy-exp">
            <div className="yy-exp-head">
              <strong>{e.company}</strong>
              <span className="yy-exp-period">{e.period}</span>
            </div>
            <div className="yy-exp-title">{e.title}</div>
            {e.description && <p className="yy-exp-desc">{e.description}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SkillsModule({ m }: { m: ModuleConfig }) {
  const list = items<string>(m)
  if (list.length === 0) return null
  return (
    <section className="yy-card">
      <h2 className="yy-card-title">技能标签</h2>
      <div className="yy-skills">
        {list.map((s, i) => (
          <span key={i} className="yy-skill">
            {s}
          </span>
        ))}
      </div>
    </section>
  )
}

function WorksModule({ m }: { m: ModuleConfig }) {
  const list = items<WorkItem>(m)
  if (list.length === 0) return null
  return (
    <section className="yy-card">
      <h2 className="yy-card-title">作品与项目</h2>
      <div className="yy-works">
        {list.map((w, i) => (
          <a key={i} className="yy-work" href={w.url} target="_blank" rel="noreferrer">
            {w.thumbnail ? (
              <img className="yy-work-thumb" src={w.thumbnail} alt="" />
            ) : (
              <span className="yy-work-thumb yy-work-thumb-ph">
                <LinkIcon width={18} height={18} />
              </span>
            )}
            <span className="yy-work-body">
              <span className="yy-work-title">{w.title}</span>
              {w.description && <span className="yy-work-desc">{w.description}</span>}
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}

export function TemplateRenderer({ config }: { config: PageConfig }) {
  const template = getTemplate(config.templateId)
  const style = { ...template.style, ...config.styleOverrides }
  const glass = style.cardBg.startsWith('rgba')

  const vars = {
    '--yy-bg': style.background,
    '--yy-card-bg': style.cardBg,
    '--yy-text': style.textColor,
    '--yy-accent': style.accentColor,
    '--yy-font': style.fontFamily,
    '--yy-radius': style.buttonStyle.radius,
    '--yy-shadow': style.buttonStyle.shadow,
  } as CSSProperties

  const modules = [...config.modules]
    .filter((m) => m.visible)
    .sort((a, b) => a.order - b.order)

  return (
    <div className={`yy-page${glass ? ' yy-glass' : ''}`} style={vars}>
      <div className="yy-column">
        {modules.map((m) => {
          switch (m.type) {
            case 'header':
              return <HeaderModule key="header" config={config} />
            case 'status':
              return <StatusModule key="status" config={config} m={m} />
            case 'contacts':
              return <ContactsModule key="contacts" m={m} />
            case 'experience':
              return <ExperienceModule key="experience" m={m} />
            case 'skills':
              return <SkillsModule key="skills" m={m} />
            case 'works':
              return <WorksModule key="works" m={m} />
            default:
              return null
          }
        })}
        <footer className="yy-footer">由「一页」生成 · 职场人的一页名片</footer>
      </div>
    </div>
  )
}
