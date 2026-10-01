import { createServer, request } from 'node:http'
import { connect, type Socket } from 'node:net'
import { resolvePublic, validateTarget } from './network.js'

/** Chromium's entire HTTP(S) traffic goes through checked, pinned public IPs. */
export async function startBrowserProxy() {
  const sockets = new Set<Socket>()
  const track = (socket: Socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    socket.on('error', () => socket.destroy())
    socket.setTimeout(30000, () => socket.destroy())
    return socket
  }
  const server = createServer((req, res) => {
    void (async () => {
      const target = validateTarget(req.url)
      if (!target || target.protocol !== 'http:') throw new Error('blocked')
      const ip = await resolvePublic(target)
      const upstream = request(target, {
        hostname: ip.address, family: ip.family, method: req.method,
        headers: { ...req.headers, host: target.host }, agent: false,
      }, (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers)
        response.pipe(res)
      })
      upstream.on('socket', track)
      upstream.on('error', () => { res.destroy() })
      req.on('aborted', () => upstream.destroy())
      req.pipe(upstream)
    })().catch(() => { res.writeHead(403); res.end() })
  })
  server.on('connection', track)
  server.on('connect', (req, client, head) => {
    void (async () => {
      const target = validateTarget(`https://${req.url}`)
      if (!target) throw new Error('blocked')
      const ip = await resolvePublic(target)
      if (client.destroyed) return
      const upstream = track(connect({ host: ip.address, family: ip.family, port: Number(target.port || 443) }))
      upstream.on('connect', () => {
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n')
        if (head.length) upstream.write(head)
        upstream.pipe(client)
        client.pipe(upstream)
      })
      upstream.on('error', () => client.destroy())
      client.on('close', () => upstream.destroy())
    })().catch(() => { client.end('HTTP/1.1 403 Forbidden\r\n\r\n') })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('proxy-start-failed')
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => {
      for (const socket of sockets) socket.destroy()
      server.close()
    },
  }
}
