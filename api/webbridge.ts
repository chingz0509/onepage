/** Server-side proxy for the public WebBridge command endpoint. */
export const maxDuration = 60

type Req = { method?: string; body?: unknown }
type Res = {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body: string) => void
}

const WEB_BRIDGE_URL = process.env.WEBBRIDGE_URL || 'http://39.107.124.201:18021/command'

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
    const response = await fetch(WEB_BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    })
    res.statusCode = response.status
    res.end(await response.text())
  } catch {
    res.statusCode = 502
    res.end(JSON.stringify({ ok: false, error: { code: 'webbridge-unavailable' } }))
  }
}
