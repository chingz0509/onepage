import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { type OnePageShare } from '../onepage'
import { OnePageShared } from './OnePageShared'

/** Shared editing chrome; personal theme colors stay inside the profile preview. */
export function EditorDialog({ title, subtitle, eyebrow, sheet = false, onClose, children }: {
  title: string; subtitle?: string; eyebrow?: string; sheet?: boolean
  onClose: () => void; children: ReactNode
}) {
  const titleId = useId()
  const root = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const resize = () => setScale(Math.min(1, window.innerWidth / 393, Math.max(.8, (window.innerHeight - 24) / 790)))
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTarget = root.current?.querySelector<HTMLElement>('input, textarea') ?? root.current?.querySelector<HTMLElement>('button')
    focusTarget?.focus()
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return }
      if (event.key !== 'Tab') return
      const controls = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], select') ?? [])].filter((control) => control.getClientRects().length)
      const first = controls[0], last = controls[controls.length - 1]
      if (!root.current?.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus() }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keyboard)
    return () => {
      document.removeEventListener('keydown', keyboard)
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return <div className={`op-editor-mask${sheet ? ' is-sheet' : ''}`} style={{ '--editor-scale': scale } as CSSProperties} onClick={onClose}>
    <div className="op-editor-dialog" ref={root} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => event.stopPropagation()}>
      <header className="op-dialog-heading">
        {eyebrow && <p className="op-dialog-kicker">{eyebrow}</p>}
        <h2 id={titleId}>{title}</h2>
        {subtitle && <p className="op-dialog-subtitle">{subtitle}</p>}
        <button type="button" className="op-dialog-close" aria-label="关闭" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
      </header>
      {children}
    </div>
  </div>
}

export function ShareDialog({ data, qr, showQr, qrFailed, copied, saving, error, onClose, onCopy, onToggleQr }: {
  data: OnePageShare; qr: string; showQr: boolean; qrFailed: boolean; copied: boolean
  saving: boolean; error: string; onClose: () => void; onCopy: () => void; onToggleQr: () => void
}) {
  return <EditorDialog title="你的一页已上线" subtitle="分享你的个人目录" eyebrow="ONE PAGE · 分享名片" onClose={onClose}>
    <div className="op-dialog-body op-share-body">
      {showQr ? <div className="op-share-qr-panel" aria-live="polite">
        {qr ? <><img className="op-share-qr" src={qr} alt="分享二维码" /><p>扫码查看我的一页</p></> : <p role={qrFailed ? 'alert' : 'status'}>{qrFailed ? '暂时无法生成二维码，请复制链接分享' : '正在生成二维码…'}</p>}
      </div> : <div className="op-share-snapshot" aria-label="主页预览"><div className="op-share-snapshot-canvas"><OnePageShared data={data} preview /></div></div>}
    </div>
    <footer className="op-dialog-actions">
      {(saving || error) && <p className="op-cloud-status" role={error ? 'alert' : 'status'}>{saving ? '正在保存…' : error}</p>}
      <button className="op-btn-continue" disabled={saving || !!error} onClick={onCopy}>{copied ? '已复制链接' : '复制链接'}</button>
      <button className="op-dialog-secondary" aria-pressed={showQr} onClick={onToggleQr}>{showQr ? '返回预览' : '查看二维码'}</button>
    </footer>
  </EditorDialog>
}
