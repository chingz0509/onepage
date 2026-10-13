import type { CSSProperties } from 'react'
import { useWindowFit } from './useWindowFit'
import './editorial-profile.css'

type Props = {
  name: string; job: string; bio: string; avatarImage: string
  avatarLoading: boolean; avatarError: string
  onName: (value: string) => void; onJob: (value: string) => void
  onBio: (value: string) => void; onAvatar: () => void
  onBack: () => void; onContinue: () => void
}

export function EditorialProfile(props: Props) {
  const { contentRef, fitScale } = useWindowFit(393)
  const bioLength = Array.from(props.bio).length
  return <main className="ep-profile" ref={contentRef} style={{ '--ep-fit-scale': fitScale } as CSSProperties}>
    <nav className="ep-navigation" aria-label="创建进度">
      <button className="ep-back" type="button" aria-label="返回" onClick={props.onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12H4m7-7-7 7 7 7" /></svg>
      </button>
      <div className="ep-progress" role="progressbar" aria-label="基础信息，第 1 步，共 3 步" aria-valuemin={0} aria-valuemax={3} aria-valuenow={1}>
        <span className="is-current" /><span /><span />
      </div>
      <span className="ep-count">01 / 03</span>
    </nav>
    <header className="ep-heading">
      <p>STEP 01 · 基础信息</p>
      <h1>先认识一下你</h1>
    </header>
    <div className="ep-identity">
      <button className="ep-avatar" type="button" aria-label={props.avatarLoading ? '头像处理中' : '更换头像'} disabled={props.avatarLoading} onClick={props.onAvatar}>
        <img src={props.avatarImage || '/onepage-design/editorial-avatar.png'} alt="头像" />
        <span className="ep-edit" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5 2-2-5-5-2 2Z" /></svg></span>
      </button>
      {props.avatarError && <p className="ep-error" role="alert">{props.avatarError}</p>}
    </div>
    <form className="ep-form" onSubmit={(event) => { event.preventDefault(); props.onContinue() }}>
      <label className="ep-field"><span>姓名</span><input name="name" autoComplete="name" value={props.name} onChange={(event) => props.onName(event.target.value)} /></label>
      <label className="ep-field"><span>职位</span><input name="job" autoComplete="organization-title" value={props.job} onChange={(event) => props.onJob(event.target.value)} /></label>
      <label className="ep-field"><span>一句话简介</span>
        <div className="ep-bio"><textarea name="bio" rows={3} value={props.bio} aria-describedby="ep-bio-count" onChange={(event) => props.onBio(Array.from(event.target.value).slice(0, 50).join(''))} /><span className="ep-bio-count" id="ep-bio-count">{bioLength} / 50</span></div>
      </label>
      <p className="ep-hint">✦ 资料已预填，可直接修改</p>
      <button className="ep-continue" type="submit" disabled={props.avatarLoading}>继续</button>
    </form>
  </main>
}
