import './directory-create-link.css'

/** The same destination is used for visitors arriving by shared URL or QR code. */
export function DirectoryCreateLink() {
  return <a className="op-directory-create-link" href="#/new">
    <span>创建我的个人目录</span>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
  </a>
}
