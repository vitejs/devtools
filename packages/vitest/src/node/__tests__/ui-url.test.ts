import type { AddressInfo } from 'node:net'
import { createServer } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveVitestUiUrl, waitForVitestUi } from '../ui-url'

const TOKEN = '0c1f9d2e-5b7a-4c3e-9f10-2a6b8d4e7c11'

describe('resolveVitestUiUrl', () => {
  const url = 'http://localhost:51204/__vitest__/'

  it('returns undefined until Vitest prints the UI line', () => {
    expect(resolveVitestUiUrl(url, '')).toBeUndefined()
    expect(resolveVitestUiUrl(url, ' DEV  v5.0.1 /repo\n')).toBeUndefined()
  })

  it('carries the printed token, ignoring ANSI colors', () => {
    const output = ` DEV  v5.0.1 /repo\n      \x1B[2m\x1B[32mUI started at http://localhost:51204/__vitest__/?token=${TOKEN}\x1B[39m\x1B[22m\n`
    expect(resolveVitestUiUrl(url, output)).toBe(`${url}?token=${TOKEN}`)
  })

  it('keeps the launcher URL when the printed URL has no token (Vitest < 5)', () => {
    expect(resolveVitestUiUrl(url, 'UI started at http://localhost:51204/__vitest__/\n')).toBe(url)
  })
})

describe('waitForVitestUi', () => {
  let close: (() => Promise<void>) | undefined

  afterEach(async () => {
    await close?.()
    close = undefined
  })

  // Mirrors Vitest 5's `vitestUiAuth` middleware: `403` without a valid
  // token or cookie, `302` to the clean URL with a valid `?token=`.
  async function startVitest5LikeServer(): Promise<string> {
    const server = createServer((req, res) => {
      const token = new URL(req.url ?? '/', 'http://localhost').searchParams.get('token')
      if (token === TOKEN) {
        res.writeHead(302, { 'Location': '/__vitest__/', 'Set-Cookie': `vitest-ui-token=${TOKEN}; Path=/__vitest__/; HttpOnly; SameSite=Strict` })
        res.end()
        return
      }
      res.statusCode = 403
      res.end('Vitest UI requires authentication.')
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    close = () => new Promise(resolve => server.close(() => resolve()))
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}/__vitest__/`
  }

  it('does not treat the 403 auth page as ready', async () => {
    const url = await startVitest5LikeServer()
    expect(await waitForVitestUi(url, 500, () => '', 50)).toBeUndefined()
  })

  it('resolves with the tokenized URL once the token is printed', async () => {
    const url = await startVitest5LikeServer()
    let output = ''
    setTimeout(() => {
      output = `UI started at ${url}?token=${TOKEN}\n`
    }, 150)
    expect(await waitForVitestUi(url, 3000, () => output, 50)).toBe(`${url}?token=${TOKEN}`)
  })

  it('resolves with the plain URL for a server without auth', async () => {
    const server = createServer((_req, res) => res.end('<html></html>'))
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    close = () => new Promise(resolve => server.close(() => resolve()))
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/__vitest__/`
    expect(await waitForVitestUi(url, 1000, () => '', 50)).toBe(url)
  })
})
