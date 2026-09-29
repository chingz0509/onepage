import pako from 'pako'
import type { PageConfig } from './types'

/**
 * 分享链接编解码：PageConfig → deflate 压缩 → base64url 字符串。
 * 发布后页面数据随 URL 传播，访问者无需 localStorage 里有数据。
 * base64url 手工实现，不依赖 btoa/atob，浏览器与 Node 均可用。
 */

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function toBase64Url(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0
    out += B64_ALPHABET[a >> 2]
    out += B64_ALPHABET[((a & 3) << 4) | (b >> 4)]
    if (i + 1 < bytes.length) out += B64_ALPHABET[((b & 15) << 2) | (c >> 6)]
    if (i + 2 < bytes.length) out += B64_ALPHABET[c & 63]
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_')
}

function fromBase64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const bytes: number[] = []
  for (let i = 0; i < b64.length; i += 4) {
    const n =
      (B64_ALPHABET.indexOf(b64[i]) << 18) |
      (B64_ALPHABET.indexOf(b64[i + 1]) << 12) |
      ((i + 2 < b64.length ? B64_ALPHABET.indexOf(b64[i + 2]) : 0) << 6) |
      (i + 3 < b64.length ? B64_ALPHABET.indexOf(b64[i + 3]) : 0)
    if (
      B64_ALPHABET.indexOf(b64[i]) < 0 ||
      B64_ALPHABET.indexOf(b64[i + 1]) < 0
    ) {
      throw new Error('invalid base64url')
    }
    bytes.push((n >> 16) & 255)
    if (i + 2 < b64.length) bytes.push((n >> 8) & 255)
    if (i + 3 < b64.length) bytes.push(n & 255)
  }
  return new Uint8Array(bytes)
}

/** 任意 JSON 值 → URL 安全字符串 */
export function encodeJson<T>(value: T): string {
  return toBase64Url(pako.deflate(JSON.stringify(value)))
}

/** 反向解码；任何一步失败（篡改/截断/乱码）都返回 null，由调用方走回退 */
export function decodeJson<T>(str: string): T | null {
  try {
    if (!/^[A-Za-z0-9\-_]+$/.test(str)) return null
    const json = pako.inflate(fromBase64Url(str), { to: 'string' })
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

/** PageConfig → URL 安全字符串 */
export function encodeConfig(config: PageConfig): string {
  return encodeJson(config)
}

/** 反向解码；任何一步失败（篡改/截断/乱码）都返回 null，由调用方走回退 */
export function decodeConfig(str: string): PageConfig | null {
  return decodeJson<PageConfig>(str)
}
