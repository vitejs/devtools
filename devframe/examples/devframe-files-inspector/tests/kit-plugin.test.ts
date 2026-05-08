import type { DevToolsViewIframe } from '@vitejs/devtools-kit'
import { createKitContext } from '@vitejs/devtools-kit/node'
import { createH3DevToolsHost } from 'devframe/node'
import { describe, expect, it, vi } from 'vitest'
import devtool from '../src/devtool'
import kitPlugin from '../src/plugin'

describe('kit-plugin (Vite DevTools dock surface)', () => {
  it('exposes the expected Vite plugin shape', () => {
    expect(kitPlugin.name).toBe('devframe:devframe-files-inspector')
    expect(typeof kitPlugin.devtools!.setup).toBe('function')
  })

  it('registers a dock entry, both RPC functions, and mounts static UI on setup', async () => {
    const mount = vi.fn()
    const host = createH3DevToolsHost({
      origin: 'http://test.localhost',
      appName: devtool.id,
      mount,
    })
    const ctx = await createKitContext({ cwd: process.cwd(), mode: 'dev', host })

    await kitPlugin.devtools!.setup!(ctx)

    expect(ctx.rpc.definitions.has('devframe-files-inspector:get-cwd')).toBe(true)
    expect(ctx.rpc.definitions.has('devframe-files-inspector:list-files')).toBe(true)

    const dock = ctx.docks.views.get('devframe-files-inspector') as DevToolsViewIframe | undefined
    expect(dock).toBeDefined()
    expect(dock!.type).toBe('iframe')
    expect(dock!.url).toBe('/.devframe-files-inspector/')
    expect(dock!.title).toBe('Files Inspector')

    expect(mount).toHaveBeenCalledTimes(1)
    expect(mount).toHaveBeenCalledWith('/.devframe-files-inspector/', devtool.cli!.distDir)
  })
})
