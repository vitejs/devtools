import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildStaticDevTools } from '../build-static'

const mutateRendererManifest = vi.hoisted(() => vi.fn())

vi.mock('@devframes/json-render-ui/hub', () => ({
  jsonRenderUiRenderer: () => ({ type: 'json-render', file: '/unused-builtin.mjs' }),
}))

vi.mock('devframe/rpc/dump', () => ({
  collectStaticRpcDump: () => ({ files: {}, manifest: {} }),
}))

vi.mock('../ui', () => ({
  createViteDevToolsUi: () => ({}),
}))

function fakeContext(): ViteDevToolsNodeContext {
  return {
    cwd: process.cwd(),
    host: { getStorageDir: () => tmpdir() },
    views: { buildStaticDirs: [] },
    docks: { values: () => [] },
    services: { ready: vi.fn() },
    rpc: {
      definitions: { values: () => [] },
      sharedState: {
        get: vi.fn(() => ({ mutate: mutateRendererManifest })),
      },
    },
  } as unknown as ViteDevToolsNodeContext
}

describe('buildStaticDevTools renderers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('copies the resolved configured renderers and publishes one manifest entry per type', async () => {
    expect.assertions(4)
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'vite-devtools-renderers-'))
    const replacementFile = join(temporaryDirectory, 'replacement.mjs')
    const customFile = join(temporaryDirectory, 'custom.mjs')
    const outputDirectory = join(temporaryDirectory, 'output')
    await writeFile(replacementFile, 'export const replacement = true')
    await writeFile(customFile, 'export const custom = true')

    await buildStaticDevTools({
      context: fakeContext(),
      outDir: outputDirectory,
      renderers: [
        { type: 'json-render', file: replacementFile },
        { type: 'custom-render', file: customFile },
      ],
    })

    expect(await readFile(join(outputDirectory, '__devtools', '__renderers', 'json-render.mjs'), 'utf8')).toBe('export const replacement = true')
    expect(await readFile(join(outputDirectory, '__devtools', '__renderers', 'custom-render.mjs'), 'utf8')).toBe('export const custom = true')
    expect(mutateRendererManifest).toHaveBeenCalledOnce()
    expect(mutateRendererManifest.mock.calls[0]![0]({})).toEqual({
      'json-render': { importFrom: '/__devtools/__renderers/json-render.mjs' },
      'custom-render': { importFrom: '/__devtools/__renderers/custom-render.mjs' },
    })
  })

  it('prefixes the deploy base onto renderer imports and the root redirect', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'vite-devtools-renderers-base-'))
    const replacementFile = join(temporaryDirectory, 'replacement.mjs')
    const outputDirectory = join(temporaryDirectory, 'output')
    await writeFile(replacementFile, 'export const replacement = true')

    await buildStaticDevTools({
      context: fakeContext(),
      outDir: outputDirectory,
      base: '/ci-build-123456/',
      renderers: [{ type: 'json-render', file: replacementFile }],
    })

    expect(mutateRendererManifest.mock.calls[0]![0]({})).toEqual({
      'json-render': { importFrom: '/ci-build-123456/__devtools/__renderers/json-render.mjs' },
    })
    expect(await readFile(join(outputDirectory, 'index.html'), 'utf8'))
      .toContain('location.replace("/ci-build-123456/__devtools/")')
  })
})
