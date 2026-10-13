import type { FetchResult } from './extract.js'
import { fetchPublicJson, validateTarget } from './network.js'

type JsonReader = (url: string) => Promise<{ data: unknown; finalUrl: string } | null>

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Read only public boards; no cookies, account credentials or private-board data. */
export async function readHuabanBoard(url: string, read: JsonReader = fetchPublicJson): Promise<FetchResult | null> {
  const target = validateTarget(url)
  if (!target || !/^(www\.)?huaban\.com$/i.test(target.hostname)) return null
  const id = target.pathname.match(/^\/boards\/([1-9]\d{0,19})\/?$/)?.[1]
  if (!id) return null
  const endpoint = new URL(`https://api.huaban.com/v3/boards/${id}`)
  endpoint.searchParams.set('fields', 'board:BOARD_DETAIL')
  try {
    const response = await read(endpoint.href)
    if (!response || !record(response.data) || !record(response.data.board)) return null
    const board = response.data.board
    if (String(board.board_id) !== id || board.is_private !== 0 ||
        typeof board.pin_count !== 'number' || !Number.isSafeInteger(board.pin_count) || board.pin_count < 0 ||
        typeof board.title !== 'string' || !board.title.trim()) return null
    const owner = record(board.user) && typeof board.user.username === 'string' ? board.user.username.trim() : ''
    return {
      ok: true,
      title: board.title.trim(),
      image: null,
      description: `${owner ? `${owner} · ` : ''}${board.pin_count} 张采集`,
      metrics: [{ label: '采集', value: String(board.pin_count) }],
      finalUrl: `https://huaban.com/boards/${id}`,
      source: 'api',
    }
  } catch { return null }
}
