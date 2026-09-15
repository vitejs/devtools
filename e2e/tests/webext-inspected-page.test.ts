import type { BrowserContext } from 'playwright-core'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright-core'
import { expect, it } from 'vitest'
import { installInspectedPageRelay } from '../../packages/webext/app/panel/inspected-page-relay'

it('preserves structured-clone values across the inspected-page extension relay', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../packages/webext/manifest.json', import.meta.url), 'utf8'))
  const directory = await mkdtemp(join(tmpdir(), 'webext-relay-'))
  const server = createServer((_request, response) => {
    response.setHeader('Content-Type', 'text/html')
    response.end(`<script>
      window.addEventListener('message', (event) => {
        if (event.data?.type !== 'devframe:inspected-page:connect') return;
        const port = event.ports[0];
        port.onmessage = ({ data }) => {
          if (data?.type === 'channel') port.postMessage(data);
        };
        port.postMessage({ type: 'ready' });
      });
    </script>`)
  })
  // Keep production transport settings and permissions; replace presentation
  // entry points with a minimal worker so this test needs no UI build.
  await writeFile(join(directory, 'manifest.json'), JSON.stringify({
    ...manifest,
    action: undefined,
    icons: undefined,
    devtools_page: undefined,
    background: { service_worker: 'background.js' },
  }))
  await writeFile(join(directory, 'background.js'), 'chrome.runtime.onInstalled.addListener(() => {})')
  await writeFile(join(directory, 'relay.js'), `(${installInspectedPageRelay.toString()})()`)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('The relay fixture did not acquire a port')
  const url = `http://127.0.0.1:${address.port}/`
  let context: BrowserContext | undefined
  try {
    context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${directory}`, `--load-extension=${directory}`],
    })
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker')
    const page = await context.newPage()
    await page.goto(url)
    const result = await worker.evaluate(async (url) => {
      const [tab] = await chrome.tabs.query({ url })
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab!.id!, frameIds: [0] },
        files: ['relay.js'],
        world: 'ISOLATED',
      })
      const port = chrome.tabs.connect(tab!.id!, {
        documentId: injection!.documentId,
        name: 'vite-devtools:inspected-page:roundtrip',
      })
      try {
        await new Promise<void>(resolve => port.onMessage.addListener(data => data.type === 'ready' && resolve()))
        const received = new Promise<any>(resolve => port.onMessage.addListener(data => data.type === 'channel' && resolve(data.data)))
        const shared = { value: 42 }
        const cycle: { self?: unknown } = {}
        cycle.self = cycle
        port.postMessage({
          type: 'channel',
          data: {
            bytes: new Uint8Array([1, 2, 255]),
            big: 9007199254740993n,
            map: new Map([['shared', shared]]),
            set: new Set([shared]),
            shared,
            cycle,
            date: new Date('2026-01-01T00:00:00Z'),
            blob: new Blob(['relay'], { type: 'text/plain' }),
          },
        })
        const data = await received
        return {
          bytes: data.bytes instanceof Uint8Array && [...data.bytes],
          big: data.big === 9007199254740993n,
          map: data.map instanceof Map && data.map.get('shared') === data.shared,
          set: data.set instanceof Set && data.set.has(data.shared),
          cycle: data.cycle.self === data.cycle,
          date: data.date instanceof Date && data.date.toISOString(),
          blob: data.blob instanceof Blob && await data.blob.text(),
        }
      }
      finally {
        port.disconnect()
      }
    }, url)
    expect(result).toEqual({
      bytes: [1, 2, 255],
      big: true,
      map: true,
      set: true,
      cycle: true,
      date: '2026-01-01T00:00:00.000Z',
      blob: 'relay',
    })
    expect(Number.parseInt(manifest.minimum_chrome_version, 10)).toBeGreaterThanOrEqual(148)
  }
  finally {
    await context?.close()
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    await rm(directory, { recursive: true, force: true })
  }
})
