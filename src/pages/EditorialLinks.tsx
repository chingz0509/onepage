import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { OnePageLink } from '../onepage'
import { PlatformIcon } from '../components/PlatformIcon'
import { WebsitePreview } from './OnePageShared'
import { useWindowFit } from './useWindowFit'
import './editorial-profile.css'
import './editorial-links.css'

export function EditorialLinks({ children, count, reading, onBack, onAdd, onContinue }: {
  children: ReactNode; count: number; reading: boolean
  onBack: () => void; onAdd: () => void; onContinue: () => void
}) {
  const { contentRef, fitScale } = useWindowFit(393)
  return <main ref={contentRef} className="lk-page" style={{ '--lk-fit-scale': fitScale } as CSSProperties}>
    <nav className="ep-navigation" aria-label="创建进度">
      <button className="ep-back" type="button" aria-label="返回" onClick={onBack}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12H4m7-7-7 7 7 7" /></svg></button>
      <div className="ep-progress" role="progressbar" aria-label="价值链接，第 2 步，共 3 步" aria-valuemin={0} aria-valuemax={3} aria-valuenow={2}><span className="is-current" /><span className="is-current" /><span /></div>
      <span className="ep-count">02 / 03</span>
    </nav>
    <header className="ep-heading lk-heading"><p>STEP 02 · 价值链接</p><h1>添加你的价值链接</h1><div className="lk-subtitle">贴上你的主页链接，AI 帮你整理成名片</div></header>
    <div className="lk-fields">
      {children}
      <button type="button" className="lk-add" onClick={onAdd}>＋ 添加链接</button>
      <p className="lk-support" aria-live="polite">{count ? `✦ 已识别 ${count} 个链接，并读取可获取的主页信息` : '支持 Dribbble · Behance · GitHub · 个人网站等主页'}</p>
    </div>
    <div className="lk-actions">
      <button type="button" className="lk-continue" disabled={!count || reading} onClick={onContinue}>继续</button>
      <button type="button" className="lk-skip" onClick={onContinue}>跳过</button>
    </div>
  </main>
}

export function EditorialCompletedLink({ card, flashing, onDelete, sortId, onMove, onNudge, sortable }: {
  card: OnePageLink; flashing: boolean; onDelete: () => void
  sortId: number; onMove: (targetId: number) => void; onNudge: (direction: -1 | 1) => void; sortable: boolean
}) {
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; y: number; direction: number } | null>(null)
  const row = useRef<HTMLDivElement>(null)
  const move = useRef(onMove)
  move.current = onMove
  const moveAtPointer = () => {
    const point = drag.current
    if (!point) return
    const target = document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>('[data-link-sort-id]')
    if (!target || target === row.current) return
    const bounds = target.getBoundingClientRect()
    if ((point.direction > 0 && point.y > bounds.top + bounds.height / 2) ||
        (point.direction < 0 && point.y < bounds.top + bounds.height / 2)) {
      move.current(Number(target.dataset.linkSortId))
    }
  }
  useEffect(() => {
    if (!dragging) return
    let frame: number
    const tick = () => {
      const list = row.current?.closest<HTMLElement>('.lk-fields')
      const point = drag.current
      if (list && point) {
        const bounds = list.getBoundingClientRect()
        const amount = point.y < bounds.top + 36 ? -6 : point.y > bounds.bottom - 36 ? 6 : 0
        if (amount) {
          point.direction = amount
          list.scrollTop += amount
          moveAtPointer()
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [dragging])
  const isWebsite = !['Dribbble', 'Behance', 'GitHub', '站酷', '掘金', '花瓣网', 'Stack Overflow'].includes(card.platform)
  return <div ref={row} data-link-sort-id={sortId} className={`lk-completed${isWebsite ? ' is-website' : ''}${flashing ? ' is-flashing' : ''}${dragging ? ' is-dragging' : ''}`}>
    <button type="button" className="lk-sort" disabled={!sortable}
      aria-label={`调整 ${card.platform} 顺序，拖动或按上下方向键`} title="拖动调整顺序，也可按上下方向键"
      onPointerDown={(event) => {
        if (event.button !== 0 || !sortable) return
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { x: event.clientX, y: event.clientY, direction: 0 }
        setDragging(true)
      }}
      onPointerMove={(event) => {
        if (!drag.current) return
        const direction = event.clientY - drag.current.y
        drag.current = { x: event.clientX, y: event.clientY, direction: direction || drag.current.direction }
        moveAtPointer()
      }}
      onPointerUp={() => { drag.current = null; setDragging(false) }}
      onPointerCancel={() => { drag.current = null; setDragging(false) }}
      onLostPointerCapture={() => { drag.current = null; setDragging(false) }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault()
          onNudge(event.key === 'ArrowUp' ? -1 : 1)
        }
      }}>
      <svg viewBox="0 0 16 24" fill="currentColor" aria-hidden="true">{[6, 12, 18].flatMap(y => [5, 11].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />))}</svg>
    </button>
    <span className="lk-platform-icon" aria-hidden="true"><PlatformIcon url={card.url} /></span>
    <span className="lk-completed-text"><strong>{isWebsite ? '个人网站' : card.platform}</strong><span title={card.url}>{card.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span></span>
    <button type="button" className="lk-remove" aria-label={`移除 ${card.platform} 链接`} title="移除链接" onClick={onDelete}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" /></svg></button>
    {!card.generic && card.value && card.value !== '✓' && <div className="lk-data">
      <p className="lk-metric"><strong>{card.value}{card.unit || ''}</strong><span>{card.metric}</span></p>
      {card.insight && <p className="lk-insight">{card.insight}</p>}
    </div>}
    <div className="lk-preview"><WebsitePreview link={card} /></div>
  </div>
}
