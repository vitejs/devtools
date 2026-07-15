import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { describe, expect, it, vi } from 'vitest'
import { DevToolsRolldownAgent } from '../index'

describe('devToolsRolldownAgent', () => {
  it('registers Rolldown tools through the standard devtools setup hook', async () => {
    const registerTool = vi.fn()
    const context = {
      agent: {
        registerTool,
      },
    } as unknown as ViteDevToolsNodeContext

    const plugin = DevToolsRolldownAgent()
    await plugin.devtools?.setup(context)

    expect(plugin.name).toBe('vite:devtools:rolldown-agent')
    expect(registerTool.mock.calls.map(([tool]) => tool.id)).toEqual([
      'rolldown:build-analysis',
      'rolldown:build-time-analysis',
      'rolldown:bundle-size-analysis',
      'rolldown:dependency-trace',
      'rolldown:build-comparison',
    ])
  })
})
