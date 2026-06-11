import type { Browser } from 'playwright-core'
import { fileURLToPath } from 'node:url'
import { resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  buildCliFixture,
  buildPluginFixture,
  collectPageErrors,
  launchBrowser,
  serveStatic,
  waitForDockReady,
} from '../src/harness'

const fixtureDir = resolve(fileURLToPath(import.meta.url), '../../fixtures/minimal-vite-app')

let browser: Browser

beforeAll(async () => {
  browser = await launchBrowser()
})

afterAll(async () => {
  await browser?.close()
})

// Regression coverage for issue #339, fixed upstream in devframe/@devframes/hub 0.5.4.
describe('issue #339: static devtools build', () => {
  it('plugin path (`vite build`) emits a working static SPA', async () => {
    const outDir = await buildPluginFixture(fixtureDir)
    const server = await serveStatic(outDir)
    try {
      const page = await browser.newPage()
      const { errors } = collectPageErrors(page)

      await page.goto(`${server.url}/__devtools/`, { waitUntil: 'domcontentloaded' })
      const ready = await waitForDockReady(page)

      expect(
        errors.find(e => /createHash is not a function/.test(e)),
        'createHash regression — node:crypto leaked into client bundle',
      ).toBeUndefined()
      expect(
        errors.find(e => /No dump match for "devtoolskit:internal:messages:list"/.test(e)),
        'RPC dump regression — messages:list dump missing for args [null]',
      ).toBeUndefined()
      expect(errors, `unexpected errors:\n${errors.join('\n')}`).toHaveLength(0)
      expect(ready, 'DevTools SPA did not render').toBe(true)
    }
    finally {
      await server.close()
    }
  })

  it('cli path (`vite-devtools build`) emits a working static SPA', async () => {
    const outDir = await buildCliFixture(fixtureDir)
    const server = await serveStatic(outDir)
    try {
      const page = await browser.newPage()
      const { errors } = collectPageErrors(page)

      await page.goto(`${server.url}/`, { waitUntil: 'domcontentloaded' })
      const ready = await waitForDockReady(page)

      expect(errors, `unexpected errors:\n${errors.join('\n')}`).toHaveLength(0)
      expect(ready, 'DevTools SPA did not render').toBe(true)
    }
    finally {
      await server.close()
    }
  })
})
