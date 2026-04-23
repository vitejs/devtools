import type { DevtoolDefinition } from '../types/devtool'

export interface KitPlugin {
  name: string
  devtools: {
    setup: DevtoolDefinition['setup']
    capabilities?: DevtoolDefinition['capabilities']
  }
}

/**
 * Produce a Vite plugin object that Kit's plugin-scan picks up via
 * `Plugin.devtools`. Kit re-exports this as `toVitePlugin` for parity
 * with the existing Vite ecosystem vocabulary.
 */
export function toKitPlugin(d: DevtoolDefinition): KitPlugin {
  return {
    name: `devframe:${d.id}`,
    devtools: {
      setup: d.setup,
      capabilities: d.capabilities,
    },
  }
}
