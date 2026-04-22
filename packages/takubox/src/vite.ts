import type { DevtoolDefinition } from './types/devtool'

export interface TakuboxVitePluginOptions {
  /**
   * Mount base (default: `/__takubox/<devtool-id>/`).
   */
  base?: string
}

/**
 * Plain Vite plugin adapter — mounts takubox into a user's Vite
 * dev server without requiring the full Kit. Returns the Vite plugin
 * shape. Actual implementation wires `configureServer` onto the
 * shared h3 handler once the CLI composition lands.
 */
export function takuboxVite(d: DevtoolDefinition, _options: TakuboxVitePluginOptions = {}): {
  name: string
  apply: 'serve'
} {
  return {
    name: `takubox:${d.id}`,
    apply: 'serve',
  }
}
