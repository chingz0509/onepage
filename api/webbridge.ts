/** Server-side proxy for the public WebBridge command endpoint. */
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

export const maxDuration = 60

type Req = { method?: string; body?: unknown }
type Res = {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body: string) => void
}

const PUBLIC_WEB_BRIDGE_URL = 'http://39.107.124.201:18021/command'
const LOCAL_WEB_BRIDGE_URL = 'http://127.0.0.1:10086/command'

export function resolveWebBridgeUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.WEBBRIDGE_URL) return env.WEBBRIDGE_URL
  return env.VERCEL ? PUBLIC_WEB_BRIDGE_URL : LOCAL_WEB_BRIDGE_URL
}

function forwardCommand(url: string, body: unknown): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    const request = (target.protocol === 'https:' ? httpsRequest : httpRequest)(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    }, (response) => {
      let text = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { text += chunk })
      response.on('end', () => resolve({ status: response.statusCode ?? 502, text }))
    })
    request.on('timeout', () => request.destroy(new Error('webbridge-timeout')))
    request.on('error', reject)
    request.end(JSON.stringify(body ?? {}))
  })
}

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST')
    res.end(JSON.stringify({ ok: false, error: { code: 'method-not-allowed' } }))
    return
  }
  try {
    const response = await forwardCommand(resolveWebBridgeUrl(), req.body)
    res.statusCode = response.status
    res.end(response.text)
  } catch {
    res.statusCode = 502
    res.end(JSON.stringify({ ok: false, error: { code: 'webbridge-unavailable' } }))
  }
}
