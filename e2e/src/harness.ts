import type { AddressInfo } from 'node:net'
import type { Browser, ConsoleMessage, Page } from 'playwright-core'
import type { InlineConfig } from 'vite'
import { readFile, stat } from 'node:fs/promises'
import { createServer as createHttpServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { lookup } from 'mrmime'
import { join, resolve } from 'pathe'
import { chromium } from 'playwright-core'
import { x } from 'tinyexec'

const repoRoot = resolve(fileURLToPath(import.meta.url), '../../..')
const cliBin = resolve(repoRoot, 'packages/core/bin.js')

export async function buildPluginFixture(fixtureDir: string): Promise<string> {
  const { build } = await import('vite')
  const inlineConfig: InlineConfig = {
    root: fixtureDir,
    logLevel: 'warn',
  }
  await build(inlineConfig)
  return resolve(fixtureDir, 'dist')
}

export async function buildCliFixture(fixtureDir: string, outDir = '.vite-devtools'): Promise<string> {
  const result = await x('node', [cliBin, 'build', '--root', fixtureDir, '--outDir', outDir], {
    throwOnError: true,
    // The CLI process should exit as soon as the build finishes. Without a
    // bound here, a hang in the child process (e.g. an open handle that
    // prevents the event loop from draining) silently burns the whole test
    // timeout with no indication of where it got stuck.
    timeout: 60_000,
  })
  if (result.exitCode !== 0)
    throw new Error(`vite-devtools build failed:\n${result.stderr}`)
  return resolve(fixtureDir, outDir)
}

export interface StaticServer {
  url: string
  close: () => Promise<void>
}

export async function serveStatic(dir: string): Promise<StaticServer> {
  const server = createHttpServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost')
      let filepath = join(dir, decodeURIComponent(url.pathname))

      let info = await stat(filepath).catch(() => null)
      if (info?.isDirectory()) {
        filepath = join(filepath, 'index.html')
        info = await stat(filepath).catch(() => null)
      }

      if (!info?.isFile()) {
        res.statusCode = 404
        res.end('Not found')
        return
      }

      const mime = lookup(filepath) ?? 'application/octet-stream'
      res.setHeader('Content-Type', mime)
      res.end(await readFile(filepath))
    }
    catch (error) {
      res.statusCode = 500
      res.end(String(error))
    }
  })

  await new Promise<void>(resolvePromise => server.listen(0, '127.0.0.1', resolvePromise))
  const { port } = server.address() as AddressInfo

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((res, rej) => server.close(err => err ? rej(err) : res())),
  }
}

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true })
}

/**
 * Opens a page that ignores HTTPS certificate errors.
 *
 * Sandboxed CI/dev environments route egress through a MITM proxy, so any
 * runtime `https://` fetch a page makes (e.g. the Iconify API fallback) fails
 * with `net::ERR_CERT_AUTHORITY_INVALID` unless certificate errors are
 * ignored for that browsing context.
 */
export async function newPage(browser: Browser): ReturnType<Browser['newPage']> {
  return browser.newPage({ ignoreHTTPSErrors: true })
}

export interface PageErrors {
  errors: string[]
}

export function collectPageErrors(page: Page): PageErrors {
  const errors: string[] = []
  page.on('pageerror', (error) => {
    errors.push(`[pageerror] ${error.message}`)
  })
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error')
      errors.push(`[console.error] ${msg.text()}`)
  })
  return { errors }
}

export async function waitForDockReady(page: Page, timeout = 15_000): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => !!document.querySelector('#app')?.firstChild,
      null,
      { timeout },
    )
    await page.waitForLoadState('networkidle', { timeout })
    return true
  }
  catch {
    return false
  }
}
