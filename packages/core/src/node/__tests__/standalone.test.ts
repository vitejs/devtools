import type { Plugin } from 'vite'
import { describe, expect, it } from 'vitest'
import { dedupeVitePlugins } from '../standalone'

describe('dedupeVitePlugins', () => {
  it('deduplicates every plugin injected by standalone regardless of its name prefix', () => {
    const injectedNames = new Set([
      'vite:devtools:server',
      'devframe:devframes-plugin-messages',
      'devtools-oxc',
    ])
    const plugins = [
      { name: 'vite:devtools:server' },
      { name: 'devframe:devframes-plugin-messages' },
      { name: 'devtools-oxc' },
      { name: 'vite:devtools:server' },
      { name: 'devframe:devframes-plugin-messages' },
      { name: 'devtools-oxc' },
    ] as Plugin[]

    dedupeVitePlugins(plugins, plugin => injectedNames.has(plugin.name))

    expect(plugins.map(plugin => plugin.name)).toEqual([
      'vite:devtools:server',
      'devframe:devframes-plugin-messages',
      'devtools-oxc',
    ])
  })

  it('preserves duplicate plugins outside the standalone injection set', () => {
    const plugins = [
      { name: 'user-plugin' },
      { name: 'user-plugin' },
    ] as Plugin[]

    dedupeVitePlugins(plugins, () => false)

    expect(plugins).toHaveLength(2)
  })
})
