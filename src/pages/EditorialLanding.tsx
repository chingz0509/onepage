import type { CSSProperties } from 'react'
import { useWindowFit } from './useWindowFit'
import './editorial-landing.css'

/** The supplied cover is a product illustration, rather than a live user page. */
export function EditorialLanding({ onCreate }: { onCreate: () => void }) {
  const { contentRef: coverRef, fitScale } = useWindowFit()

  return (
    <main ref={coverRef} className="el-cover" style={{ '--el-fit-scale': fitScale } as CSSProperties}>
      <header className="el-masthead">
        <span className="el-wordmark">ONE PAGE</span>
        <span>VOL.1 — 职场价值特辑</span>
      </header>

      <section className="el-introduction" aria-labelledby="el-title">
        <h1 id="el-title">你的个人目录</h1>
        <p>不止介绍你的工作，也让人认识你。粘贴链接，AI 读取公开数据，30 秒生成一页名片。</p>
      </section>

      <figure className="el-showcase">
        <p className="el-issue">— NO.001 · 本期封面 · 青瓷微雨 —</p>
        <img className="el-card-stack" src="/onepage-design/landing-card-stack-rose-mist.png" width="716" height="694" alt="青瓷微雨主题名片示例：林小满，资深 UI 设计师，包含 Dribbble 和个人网站链接；后方叠放浅藕粉及雾蓝灰主题名片。" />
        <figcaption>12 套主题 · 换一种底色，换一种气质</figcaption>
      </figure>

      <section className="el-create" aria-label="创建个人目录">
        <button type="button" onClick={onCreate}>创建我的个人目录</button>
        <p>免费创建 · 无需注册 · 约 30 秒生成</p>
      </section>

      <footer className="el-footer">
        <p>自动读取 GITHUB · 花瓣 · 脉脉 等平台的公开数据</p>
        <p>ONE PAGE · AI-POWERED LINK IN BIO</p>
      </footer>
    </main>
  )
}
