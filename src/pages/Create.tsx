import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import type { ModuleConfig, ModuleType, PageConfig, Profile, StatusMode } from '../types'
import { TEMPLATES, getTemplate } from '../templates'
import { PERSONAS, type PersonaDraft } from '../personas'
import { recommendTemplates } from '../recommend'
import { savePage } from '../store'
import { validatePastedDraft } from '../validate'
import { encodeConfig } from '../shareCodec'
import { navigate, pageUrl } from '../router'
import { TemplateRenderer } from '../components/TemplateRenderer'

const MODULE_NAMES: Record<ModuleType, string> = {
  header: '名片头',
  contacts: '联系方式',
  experience: '职业经历',
  skills: '技能标签',
  works: '作品项目',
  status: '状态徽章',
}

const STATUS_OPTIONS: Array<{ value: StatusMode; label: string }> = [
  { value: 'looking', label: '正在看机会' },
  { value: 'open', label: '开放合作' },
  { value: 'busy', label: '勿扰' },
]

const PASTE_EXAMPLE = `{
  "profile": {
    "name": "张三",
    "title": "产品经理",
    "company": "某大厂",
    "bio": "一句话介绍自己",
    "avatarUrl": ""
  },
  "moduleData": {
    "skills": { "items": ["用户增长", "数据分析"] }
  }
}`

interface Draft {
  profile: Profile
  moduleData: Record<string, Record<string, unknown>>
}

export function Create() {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [personaId, setPersonaId] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [pasteState, setPasteState] = useState<'idle' | 'ok' | 'error'>('idle')

  const [templateId, setTemplateId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [modules, setModules] = useState<ModuleConfig[]>([])
  const [published, setPublished] = useState<PageConfig | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  // 推荐逻辑（Week 1 规则版；Week 2 换 AI，签名不变）
  const recommendations = useMemo(
    () => (draft ? recommendTemplates(draft.profile, TEMPLATES) : []),
    [draft],
  )

  function pickPersona(p: PersonaDraft) {
    setPersonaId(p.id)
    setPasteText('')
    setPasteState('idle')
    setDraft({ profile: p.profile, moduleData: p.moduleData as Draft['moduleData'] })
  }

  function onPasteChange(text: string) {
    setPasteText(text)
    if (!text.trim()) {
      setPasteState('idle')
      return
    }
    const parsed = validatePastedDraft(text)
    if (parsed) {
      setPasteState('ok')
      setPersonaId(null)
      setDraft(parsed)
    } else {
      setPasteState('error')
    }
  }

  function enterEditor() {
    if (!draft || !templateId) return
    const template = getTemplate(templateId)
    setProfile({ ...draft.profile })
    setModules(
      template.defaultModules.map((m) => ({
        ...m,
        data: draft.moduleData[m.type] ?? m.data,
      })),
    )
    setStep(2)
  }

  function toggleModule(type: ModuleType) {
    setModules((ms) => ms.map((m) => (m.type === type ? { ...m, visible: !m.visible } : m)))
  }

  function setStatusMode(mode: StatusMode) {
    setModules((ms) =>
      ms.map((m) => (m.type === 'status' ? { ...m, data: { ...m.data, mode } } : m)),
    )
  }

  const previewConfig: PageConfig | null =
    profile && templateId
      ? { slug: 'preview', templateId, profile, modules }
      : null

  function publish() {
    if (!previewConfig) return
    const { slug: _omit, ...rest } = previewConfig
    // localStorage 仍保存一份，作为本机「我的作品」缓存
    setPublished(savePage(rest))
  }

  // 分享链接：URL 携带 deflate+base64url 编码的完整页面数据
  const shareUrl = useMemo(
    () => (published ? pageUrl(published.slug, encodeConfig(published)) : ''),
    [published],
  )

  useEffect(() => {
    if (!shareUrl) return
    QRCode.toDataURL(shareUrl, { width: 360, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [shareUrl])

  // ---------- 发布成功 ----------
  if (published) {
    return (
      <div className="app-shell">
        <nav className="app-nav">
          <span className="app-logo">
            <span className="app-logo-mark">页</span>OnePage
          </span>
        </nav>
        <div className="publish-result">
          <h2>发布成功 🎉</h2>
          <p className="wizard-sub">把链接放到脉脉签名档，或扫码分享给朋友</p>
          <div>
            <span className="publish-link">{shareUrl}</span>
          </div>
          <div>{qrDataUrl && <img className="publish-qr" src={qrDataUrl} alt="页面二维码" />}</div>
          <p className="wizard-sub" style={{ marginTop: 12 }}>
            此链接包含全部页面数据，发给任何人都能打开
          </p>
          <div className="publish-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/p/${published.slug}?d=${encodeConfig(published)}`)}
            >
              打开页面
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => navigator.clipboard?.writeText(shareUrl)}
            >
              复制链接
            </button>
            <button className="btn btn-ghost" onClick={() => window.location.reload()}>
              再建一个
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <span className="app-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <span className="app-logo-mark">页</span>OnePage
        </span>
      </nav>

      <div className="wizard-steps">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`wizard-step-dot${step >= i ? ' active' : ''}`} />
        ))}
      </div>

      {/* ---------- 第 1 步：选择人设 ---------- */}
      {step === 0 && (
        <section>
          <h1 className="wizard-title">第 1 步 · 你是谁？</h1>
          <p className="wizard-sub">挑一个 demo 人设快速体验，或粘贴你自己的资料 JSON</p>

          <div className="persona-grid">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                className={`persona-card${personaId === p.id ? ' selected' : ''}`}
                onClick={() => pickPersona(p)}
              >
                <img src={p.profile.avatarUrl} alt="" />
                <span>
                  <div className="persona-label">{p.label}</div>
                  <div className="persona-tagline">{p.tagline}</div>
                </span>
              </button>
            ))}
          </div>

          <div className="paste-box">
            <p className="paste-hint">
              或者粘贴自己的资料（JSON，至少包含 <code>profile</code> 字段，例如：
              <code>{'{"profile":{"name":"…","title":"…","company":"…","bio":"…","avatarUrl":"…"}}'}</code>）
            </p>
            <textarea
              placeholder={PASTE_EXAMPLE}
              value={pasteText}
              onChange={(e) => onPasteChange(e.target.value)}
            />
            {pasteState === 'error' && (
              <p className="paste-error">JSON 格式不正确：需要合法的 JSON，且包含 profile 的 5 个字符串字段。</p>
            )}
            {pasteState === 'ok' && <p className="paste-ok">✓ 资料校验通过，已就绪</p>}
          </div>

          <div className="wizard-actions">
            <button className="btn btn-primary" disabled={!draft} onClick={() => setStep(1)}>
              下一步：选模板
            </button>
          </div>
        </section>
      )}

      {/* ---------- 第 2 步：模板库 ---------- */}
      {step === 1 && draft && (
        <section>
          <h1 className="wizard-title">第 2 步 · 选一套模板</h1>
          <p className="wizard-sub">
            根据「{draft.profile.title || draft.profile.name}」的职业特征，为你标注了推荐模板
          </p>

          <div className="template-grid">
            {TEMPLATES.map((t) => {
              const rec = recommendations.find((r) => r.templateId === t.id)
              return (
                <button
                  key={t.id}
                  className={`template-card${templateId === t.id ? ' selected' : ''}`}
                  onClick={() => setTemplateId(t.id)}
                >
                  {rec && <span className="rec-badge">推荐</span>}
                  <div className="template-preview" style={{ background: t.style.background }}>
                    <span className="tp-avatar" style={{ background: t.style.accentColor }} />
                    <span
                      className="tp-bar"
                      style={{ width: '40%', background: t.style.textColor, opacity: 0.85 }}
                    />
                    <span
                      className="tp-bar"
                      style={{ width: '64%', background: t.style.textColor, opacity: 0.35 }}
                    />
                    <span
                      className="tp-card"
                      style={{
                        background: t.style.cardBg,
                        borderRadius: t.style.buttonStyle.radius,
                        boxShadow: t.style.buttonStyle.shadow,
                      }}
                    />
                    <span
                      className="tp-card"
                      style={{
                        background: t.style.cardBg,
                        borderRadius: t.style.buttonStyle.radius,
                        boxShadow: t.style.buttonStyle.shadow,
                      }}
                    />
                  </div>
                  <div className="template-name">{t.name}</div>
                  <div className="template-desc">{t.description}</div>
                  {rec && <div className="rec-reason">✦ {rec.reason}</div>}
                </button>
              )
            })}
          </div>

          <div className="wizard-actions">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>
              上一步
            </button>
            <button className="btn btn-primary" disabled={!templateId} onClick={enterEditor}>
              下一步：编辑内容
            </button>
          </div>
        </section>
      )}

      {/* ---------- 第 3 步：编辑 + 预览 ---------- */}
      {step === 2 && profile && previewConfig && (
        <section>
          <h1 className="wizard-title">第 3 步 · 编辑与发布</h1>
          <p className="wizard-sub">调整文字和模块开关，右侧实时预览</p>

          <div className="editor-layout">
            <div>
              <div className="editor-panel">
                <h3>基本资料</h3>
                {(
                  [
                    ['name', '姓名'],
                    ['title', '职位'],
                    ['company', '公司'],
                  ] as const
                ).map(([key, label]) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input
                      value={profile[key]}
                      onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="field">
                  <label>一句话 Bio</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  />
                </div>
                {modules.some((m) => m.type === 'status' && m.visible) && (
                  <div className="field">
                    <label>当前状态</label>
                    <select
                      value={
                        (modules.find((m) => m.type === 'status')?.data.mode as StatusMode) ??
                        'open'
                      }
                      onChange={(e) => setStatusMode(e.target.value as StatusMode)}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="editor-panel" style={{ marginTop: 16 }}>
                <h3>模块开关</h3>
                {modules.map((m) => (
                  <div className="module-toggle" key={m.type}>
                    <span>{MODULE_NAMES[m.type]}</span>
                    <button
                      className={`switch${m.visible ? ' on' : ''}`}
                      aria-label={`${MODULE_NAMES[m.type]}开关`}
                      onClick={() => toggleModule(m.type)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="preview-frame">
              <TemplateRenderer config={previewConfig} />
            </div>
          </div>

          <div className="wizard-actions">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              上一步
            </button>
            <button className="btn btn-primary" onClick={publish}>
              发布我的 OnePage
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
