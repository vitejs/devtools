import type { DevtoolDefinition } from '../types/devtool'

export interface CreateKitPluginOptions {
  /**
   * Optional plugin name override. Defaults to `devframe:<devtool-id>`.
   */
  name?: string
}

export interface KitPlugin {
  name: string
  devtools: {
    setup: DevtoolDefinition['setup']
    capabilities?: DevtoolDefinition['capabilities']
  }
}

/**
 * Produce a Vite plugin object that Kit's plugin-scan picks up via
 * `Plugin.devtools`.
 */
export function createKitPlugin(d: DevtoolDefinition, options: CreateKitPluginOptions = {}): KitPlugin {
  return {
    name: options.name ?? `devframe:${d.id}`,
    devtools: {
      setup: d.setup,
      capabilities: d.capabilities,
    },
  }
}
