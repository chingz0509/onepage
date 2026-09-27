import type { TemplateConfig } from '../types'
import maimaiBusiness from './maimai-business.json'
import midnight from './midnight.json'
import aurora from './aurora.json'

/**
 * 模板注册表。模板本体是纯 JSON 文件（模板即 JSON），
 * Week 2 接服务端时此处改为远端拉取即可，消费方不用变。
 */
export const TEMPLATES: TemplateConfig[] = [
  maimaiBusiness as TemplateConfig,
  midnight as TemplateConfig,
  aurora as TemplateConfig,
]

export const DEFAULT_TEMPLATE_ID = 'maimai-business'

export function getTemplate(id: string): TemplateConfig {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
}
