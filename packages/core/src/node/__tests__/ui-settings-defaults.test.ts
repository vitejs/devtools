import { beforeEach, describe, expect, it, vi } from 'vitest'

const createUi = vi.hoisted(() => vi.fn(() => ({})))

vi.mock('@devframes/hub-ui', () => ({ createUi }))
vi.mock('../plugins/server', () => ({ DevToolsServer: vi.fn(() => ({ name: 'vite:devtools:server' })) }))

const settingsDefaults = { commandShortcuts: { 'devframes:toggle-palette': [] } }

describe('settings defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards them to the hub UI', async () => {
    const { createViteDevToolsUi } = await import('../ui')

    createViteDevToolsUi({ settingsDefaults })

    expect(createUi).toHaveBeenCalledWith(expect.objectContaining({ settingsDefaults }))
  })

  it('hands them to the server plugin', async () => {
    const { createDevToolsPlugins } = await import('../plugins/index')
    const { DevToolsServer } = await import('../plugins/server')

    await createDevToolsPlugins({ settingsDefaults, builtinDevTools: false })

    expect(DevToolsServer).toHaveBeenCalledWith(expect.objectContaining({ settingsDefaults }), undefined, undefined)
  })
})
