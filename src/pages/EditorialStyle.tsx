import { useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react'
import './editorial-profile.css'
import './editorial-style.css'

export function EditorialStyle({ preview, children, onBack }: { preview: ReactNode; children: ReactNode; onBack: () => void }) {
  const [actionScale, setActionScale] = useState(1)
  useLayoutEffect(() => {
    const resize = () => setActionScale(Math.min(1, window.innerWidth / 393, (window.innerHeight - 24) / 790))
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  return <main className="es-page" style={{ '--es-action-scale': actionScale } as CSSProperties}>
    <nav className="ep-navigation" aria-label="创建进度">
      <button type="button" className="ep-back" aria-label="返回" onClick={onBack}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12H4m7-7-7 7 7 7" /></svg></button>
      <div className="ep-progress" role="progressbar" aria-label="定制风格，第 3 步，共 3 步" aria-valuemin={0} aria-valuemax={3} aria-valuenow={3}><span className="is-current" /><span className="is-current" /><span className="is-current" /></div>
      <span className="ep-count">03 / 03</span>
    </nav>
    <header className="ep-heading"><p>STEP 03 · 个人风格</p></header>
    <div className="es-preview" aria-label="实时名片预览">{preview}</div>
    <section className="op-style-sheet es-panel" aria-label="风格选项"><h1 className="es-panel-title">定制你的风格</h1>{children}</section>
  </main>
}
