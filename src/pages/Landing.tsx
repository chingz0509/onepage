import { navigate } from '../router'
import { ArrowRightIcon } from '../components/icons'

export function Landing() {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <span className="app-logo">
          <span className="app-logo-mark">页</span>一页
        </span>
        <button className="btn btn-primary" onClick={() => navigate('/create')}>
          创建我的一页
        </button>
      </nav>

      <section className="hero">
        <h1>
          你的职场身份，<em>一页</em>就够了
        </h1>
        <p>
          「一页」是职场人的 link-in-bio：把联系方式、职业经历、技能、作品聚合到一个链接，
          放在脉脉签名、微信状态、邮件落款——别人点开这一页，就认识完整的你。
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/create')}>
          创建我的一页 <ArrowRightIcon width={18} height={18} />
        </button>

        <div className="hero-features">
          <div className="feature-card">
            <h3>模板即 JSON</h3>
            <p>视觉风格由结构化配置驱动，选一套模板，一秒换肤。</p>
          </div>
          <div className="feature-card">
            <h3>6 大职场模块</h3>
            <p>名片头、联系方式、职业经历、技能标签、作品链接、求职状态，自由开关。</p>
          </div>
          <div className="feature-card">
            <h3>为手机而生</h3>
            <p>移动端优先设计，点开链接的每一屏都好看。</p>
          </div>
        </div>
      </section>
    </div>
  )
}
