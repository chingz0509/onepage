import type { Profile, TemplateConfig } from './types'

export interface Recommendation {
  templateId: string
  reason: string
}

/**
 * 按职业推荐模板 —— Week 1 为纯规则逻辑。
 *
 * ⚡ Week 2 AI 接入点 #1：保持函数签名不变，
 * 内部换成「把 profile + templates 摘要发给模型，返回推荐及理由」即可，
 * 调用方（模板库步骤）无需改动。
 */
export function recommendTemplates(
  profile: Profile,
  templates: TemplateConfig[],
): Recommendation[] {
  const text = `${profile.title} ${profile.company} ${profile.bio}`

  const rules: Array<{ keywords: RegExp; templateId: string; reason: string }> = [
    {
      keywords: /设计|designer|ui|ux|视觉|创意/i,
      templateId: 'aurora',
      reason: '创意类职业，适合个性张扬的渐变色模板',
    },
    {
      keywords: /工程师|开发|程序|engineer|前端|后端|算法|技术/i,
      templateId: 'midnight',
      reason: '技术从业者偏爱深色极客风，代码感十足',
    },
    {
      keywords: /猎头|销售|商务|市场|运营|bd|顾问|hr/i,
      templateId: 'maimai-business',
      reason: '商务场景需要简洁可信的专业形象',
    },
  ]

  const hits: Recommendation[] = []
  for (const rule of rules) {
    if (rule.keywords.test(text) && templates.some((t) => t.id === rule.templateId)) {
      hits.push({ templateId: rule.templateId, reason: rule.reason })
    }
  }

  // 兜底：没有任何规则命中时推荐默认商务模板
  if (hits.length === 0) {
    hits.push({
      templateId: 'maimai-business',
      reason: '百搭的商务风，适合大多数职场场景',
    })
  }

  // 最多高亮 3 套，且保证返回的模板都存在
  return hits.filter((h) => templates.some((t) => t.id === h.templateId)).slice(0, 3)
}
