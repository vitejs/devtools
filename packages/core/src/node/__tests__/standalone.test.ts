import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import { describe, expect, it, vi } from 'vitest'
import { startStandaloneDevTools } from '../standalone'

describe('startStandaloneDevTools', () => {
  it('includes explicitly provided headless plugins in context setup', async () => {
    const setup = vi.fn()
    const plugin: PluginWithDevTools = {
      name: 'test-headless-agent-provider',
      devtools: {
        setup,
      },
    }

    await startStandaloneDevTools({
      cwd: process.cwd(),
      builtinDevTools: false,
      plugins: [plugin],
    })

    expect(setup).toHaveBeenCalledOnce()
  })
})
