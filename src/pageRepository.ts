import type { OnePageShare } from './onepage'

export type SavedPage = { slug: string; editToken: string; data: OnePageShare }

async function request(path: string, options?: RequestInit) {
  const response = await fetch(path, { ...options, signal: AbortSignal.timeout(30000) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error ?? 'storage-unavailable')
  return result
}

export async function savePage(data: OnePageShare, credential?: { slug: string; editToken: string }): Promise<SavedPage> {
  return request('/api/pages', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, ...credential }),
  })
}

export async function readPage(slug: string): Promise<OnePageShare | null> {
  try { return (await request(`/api/pages?slug=${encodeURIComponent(slug)}`)).data }
  catch (error) {
    if (error instanceof Error && (error.message === 'not-found' || error.message === 'invalid-slug')) return null
    throw error
  }
}
