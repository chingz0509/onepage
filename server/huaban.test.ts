import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readHuabanBoard } from './huaban.js'

const url = 'https://huaban.com/boards/27823016'
const publicBoard = { board_id: 27823016, title: '作品', pin_count: 111, is_private: 0, user: { username: 'cSummer' } }

test('reads the public board API instead of relying on the blocked HTML page', async () => {
  const result = await readHuabanBoard(url, async (endpoint) => {
    assert.equal(endpoint, 'https://api.huaban.com/v3/boards/27823016?fields=board%3ABOARD_DETAIL')
    return { data: { board: publicBoard }, finalUrl: endpoint }
  })
  assert.ok(result?.ok)
  assert.equal(result.source, 'api')
  assert.equal(result.title, '作品')
  assert.equal(result.finalUrl, url)
  assert.deepEqual(result.metrics, [{ label: '采集', value: '111' }])
  assert.equal(result.description, 'cSummer · 111 张采集')
})

test('accepts zero collections but rejects private, missing, mismatched or invalid board data', async () => {
  const read = (board: unknown) => readHuabanBoard(url, async (endpoint) => ({ data: { board }, finalUrl: endpoint }))
  const empty = await read({ ...publicBoard, pin_count: 0 })
  assert.ok(empty?.ok)
  assert.equal(empty.metrics[0].value, '0')
  for (const board of [null, { ...publicBoard, is_private: 1 }, { ...publicBoard, is_private: undefined },
    { ...publicBoard, board_id: 1 }, { ...publicBoard, pin_count: -1 }, { ...publicBoard, pin_count: '111' }]) {
    assert.equal(await read(board), null)
  }
})

test('only requests exact Huaban board URLs and permits the existing fallback on API failure', async () => {
  for (const target of ['https://huaban.com/users/designer', 'https://evil.example/boards/27823016',
    'https://huaban.com.evil.example/boards/27823016', 'https://huaban.com/boards/not-a-number']) {
    assert.equal(await readHuabanBoard(target, async () => { assert.fail('should not request API') }), null)
  }
  assert.equal(await readHuabanBoard(url, async () => null), null)
  assert.equal(await readHuabanBoard(url, async () => { throw new Error('timeout') }), null)
})
