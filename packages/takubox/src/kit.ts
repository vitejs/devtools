import type { DevtoolDefinition } from './types/devtool'

/**
 * Produce a Kit-compatible plugin object (`PluginWithDevTools`) from a
 * takubox `DevtoolDefinition`. Kit exports `toVitePlugin` as a
 * convenience alias.
 */
export function toKitPlugin(d: DevtoolDefinition): {
  name: string
  devtools: { setup: DevtoolDefinition['setup'] }
} {
  return {
    name: `takubox:${d.id}`,
    devtools: {
      setup: d.setup,
    },
  }
}
