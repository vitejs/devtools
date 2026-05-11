import type { AddressInfo } from 'node:net'
import type { ServeStaticOptions } from './serve-static'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp, toNodeListener } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { serveStaticHandler, serveStaticNodeMiddleware } from './serve-static'

interface Fixture {
  dir: string
  baseUrl: string
  close: () => Promise<void>
}

function makeTmp(prefix = 'devframe-serve-'): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

async function startH3(dir: string, options?: ServeStaticOptions): Promise<Fixture> {
  const app = createApp()
  app.use(serveStaticHandler(dir, options))
  const server = createServer(toNodeListener(app))
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as AddressInfo).port
  return {
    dir,
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>(r => server.close(() => r())),
  }
}

async function startMw(
  dir: string,
  options?: ServeStaticOptions,
  next: (req: { url?: string }, res: import('node:http').ServerResponse) => void = (_req, res) => {
    res.statusCode = 404
    res.end('next-fallback')
  },
): Promise<Fixture> {
  const mw = serveStaticNodeMiddleware(dir, options)
  const server = createServer((req, res) => {
    mw(req, res, () => next(req, res))
  })
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as AddressInfo).port
  return {
    dir,
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>(r => server.close(() => r())),
  }
}

describe('serveStaticHandler', () => {
  let fx: Fixture | undefined

  afterEach(async () => {
    await fx?.close()
    fx = undefined
  })

  it('serves a direct file hit with correct Content-Type', async () => {
    const dir = makeTmp()
    writeFileSync(join(dir, 'app.js'), 'console.log("hi")', 'utf-8')
    fx = await startH3(dir)

    const res = await fetch(`${fx.baseUrl}/app.js`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/javascript/)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.text()).toBe('console.log("hi")')
  })

  it('serves index.html for a directory request with HTML charset', async () => {
    const dir = makeTmp()
    writeFileSync(join(dir, 'index.html'), '<title>root</title>', 'utf-8')
    fx = await startH3(dir)

    const res = await fetch(`${fx.baseUrl}/`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(await res.text()).toBe('<title>root</title>')
  })

  it('falls back to index.html for an extension-less miss (SPA routing)', async () => {
    const dir = makeTmp()
    writeFileSync(join(dir, 'index.html'), '<title>spa</title>', 'utf-8')
    fx = await startH3(dir)

    const res = await fetch(`${fx.baseUrl}/users/42`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<title>spa</title>')
  })

  it('returns 404 for an asset-looking miss instead of SPA-falling back', async () => {
    const dir = makeTmp()
    writeFileSync(join(dir, 'index.html'), '<title>spa</title>', 'utf-8')
    fx = await startH3(dir)

    const res = await fetch(`${fx.baseUrl}/nonexistent.js`)
    expect(res.status).toBe(404)
  })

  it('returns 404 when SPA fallback has no index to serve', async () => {
    const dir = makeTmp()
    writeFileSync(join(dir, 'app.js'), 'x', 'utf-8')
    fx = await startH3(dir)

    const res = await fetch(`${fx.baseUrl}/some/deep/route`)
    expect(res.status).toBe(404)
  })

  it('rejects encoded path-traversal attempts', async () => {
    const dir = makeTmp()
    writeFileSync(join(dir, 'index.html'), 'ok', 'utf-8')
    fx = await startH3(dir)

    // Encoded `..` segments survive URL construction; the path-traversal
    // guard rejects the resolved absolute path, and the `.js` suffix
    // disables SPA fallback so this returns 404 (not index.html).
    const res = await fetch(`${fx.baseUrl}/..%2F..%2F..%2Fetc%2Fpasswd.js`)
    expect(res.status).toBe(404)
  })

  it('responds to HEAD with headers but no body', async () => {
    const dir = makeTmp()
    writeFileSync(join(dir, 'app.js'), 'console.log("body")', 'utf-8')
    fx = await startH3(dir)

    const res = await fetch(`${fx.baseUrl}/app.js`, { method: 'HEAD' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-length')).toBe('19')
    expect(await res.text()).toBe('')
  })

  it('rejects POST with 405', async () => {
    const dir = makeTmp()
    writeFileSync(join(dir, 'index.html'), 'ok', 'utf-8')
    fx = await startH3(dir)

    const res = await fetch(`${fx.baseUrl}/`, { method: 'POST', body: 'x' })
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('GET, HEAD')
  })

  it('decodes percent-encoded paths', async () => {
    const dir = makeTmp()
    mkdirSync(join(dir, 'has space'))
    writeFileSync(join(dir, 'has space', 'file.txt'), 'spaced', 'utf-8')
    fx = await startH3(dir)

    const res = await fetch(`${fx.baseUrl}/has%20space/file.txt`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('spaced')
  })

  it('resolves extension-less paths via .html (sirv extensions parity)', async () => {
    const dir = makeTmp()
    writeFileSync(join(dir, 'about.html'), '<title>about</title>', 'utf-8')
    writeFileSync(join(dir, 'index.html'), '<title>root</title>', 'utf-8')
    fx = await startH3(dir)

    const res = await fetch(`${fx.baseUrl}/about`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<title>about</title>')
  })
})

describe('serveStaticNodeMiddleware', () => {
  let fx: Fixture | undefined

  afterEach(async () => {
    await fx?.close()
    fx = undefined
  })

  it('serves files inside a Connect-style next chain', async () => {
    const dir = makeTmp()
    writeFileSync(join(dir, 'app.js'), 'console.log("mw")', 'utf-8')
    fx = await startMw(dir)

    const res = await fetch(`${fx.baseUrl}/app.js`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('console.log("mw")')
  })

  it('calls next() on miss when SPA fallback is disabled', async () => {
    const dir = makeTmp()
    fx = await startMw(dir, { single: false }, (_req, res) => {
      res.statusCode = 418
      res.end('teapot')
    })

    const res = await fetch(`${fx.baseUrl}/missing.js`)
    expect(res.status).toBe(418)
    expect(await res.text()).toBe('teapot')
  })

  it('falls back to index.html on SPA routes (matches handler behavior)', async () => {
    const dir = makeTmp()
    writeFileSync(join(dir, 'index.html'), '<title>mw-spa</title>', 'utf-8')
    fx = await startMw(dir)

    const res = await fetch(`${fx.baseUrl}/some/deep/path`)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<title>mw-spa</title>')
  })
})
