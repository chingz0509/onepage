import { lookup } from 'node:dns/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import ipaddr from 'ipaddr.js'

export function isPublicAddress(address: string): boolean {
  try {
    return ipaddr.process(address).range() === 'unicast'
  } catch {
    return false
  }
}

export function validateTarget(raw: string | null | undefined): URL | null {
  try {
    const url = new URL(raw ?? '')
    const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '')
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    if (url.port && !['80', '443'].includes(url.port)) return null
    if (/^(localhost|.*\.(localhost|local|internal|lan))$/i.test(host)) return null
    if (ipaddr.isValid(host) && !isPublicAddress(host)) return null
    return url
  } catch {
    return null
  }
}

export async function resolvePublic(url: URL) {
  const records = await lookup(url.hostname.replace(/^\[|\]$/g, ''), { all: true })
  if (!records.length || records.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('blocked-address')
  }
  return records[0]
}

/** Pin each connection to a checked public IP; validate every redirect separately. */
export async function fetchPublicHtml(raw: string, timeoutMs = 8000): Promise<{ html: string; finalUrl: string } | null> {
  const deadline = Date.now() + timeoutMs
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let target = raw
    for (let redirects = 0; redirects <= 5; redirects++) {
      const url = validateTarget(target)
      if (!url || Date.now() >= deadline) return null
      const record = await resolvePublic(url)
      const result = await new Promise<{ html?: string; redirect?: string }>((resolve, reject) => {
        const request = url.protocol === 'https:' ? httpsRequest : httpRequest
        const req = request(url, {
          hostname: record.address,
          family: record.family,
          servername: url.hostname.replace(/^\[|\]$/g, ''),
          agent: false,
          signal: controller.signal,
          headers: {
            Host: url.host,
            'User-Agent': 'Mozilla/5.0 (compatible; OnePage/1.0)',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Encoding': 'identity',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          },
        }, (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0) && res.headers.location) {
            resolve({ redirect: new URL(res.headers.location, url).href })
            res.destroy()
            return
          }
          if (res.statusCode !== 200 || !/text\/html|application\/xhtml\+xml/i.test(res.headers['content-type'] ?? '')) {
            res.destroy()
            resolve({})
            return
          }
          const chunks: Buffer[] = []
          let size = 0
          res.on('data', (chunk: Buffer) => {
            size += chunk.length
            if (size > 2 * 1024 * 1024) {
              res.destroy(new Error('response-too-large'))
              return
            }
            chunks.push(chunk)
          })
          res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }))
          res.on('error', reject)
        })
        req.on('error', reject)
        req.end()
      })
      if (result.redirect) { target = result.redirect; continue }
      return result.html ? { html: result.html, finalUrl: url.href } : null
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
