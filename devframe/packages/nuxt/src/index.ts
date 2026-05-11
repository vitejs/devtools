import type { DevframeDefinition } from 'devframe/types'
import { addPlugin, addVitePlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import { createVitePlugin } from 'devframe/adapters/vite'

export interface DevframeNuxtModuleOptions {
  /**
   * Base URL, relative to the deployed page, where the devframe
   * connection meta (`__connection.json`) and dump shards live.
   * Defaults to `'./'` — the SPA root — so a single build works at any
   * deployment base (the browser resolves relative fetches against
   * `document.baseURI`).
   */
  baseURL?: string
  /**
   * Disable the opinionated Nuxt app defaults (`app.baseURL: './'`,
   * `vite.base: './'`). Set to `true` if you need to own these yourself.
   * Defaults to `false` — devframe sets sensible base-agnostic defaults.
   */
  skipAppDefaults?: boolean
  /**
   * Devframe definition that powers the dev-time RPC bridge. When set
   * (and Nuxt is in dev mode), the module starts a separate RPC + WS
   * server alongside `nuxt dev` and registers Vite middleware at
   * `${baseURL}__connection.json` so the client SPA can discover the
   * WS endpoint. Without it the module stays client-only.
   */
  devframe?: DevframeDefinition
  /**
   * Dev-time middleware mode. Mirrors `createVitePlugin`'s option of the
   * same name.
   *
   *  - `true` (default) — when `devframe` is set and Nuxt is in dev
   *    mode, start the RPC bridge with all defaults.
   *  - `false` — skip the bridge entirely. The module remains
   *    client-only.
   *  - object — enable with explicit overrides.
   */
  devMiddleware?: boolean | {
    /** Override the bridge port. Default: resolved via `get-port-please`. */
    port?: number
    /**
     * Override the bridge bind host. Defaults to
     * `nuxt.options.devServer.host ?? devframe.cli?.host ?? 'localhost'`,
     * so `nuxt dev --host` propagates automatically.
     */
    host?: string
    /** Flag bag forwarded to `devframe.setup(ctx, { flags })`. */
    flags?: Record<string, unknown>
  }
}

/**
 * Nuxt module that wires a Nuxt-built SPA up as a devframe client, and
 * (optionally) serves the dev-time RPC bridge alongside `nuxt dev`.
 *
 *   - Sets `app.baseURL: './'` + `vite.base: './'` so the production
 *     build is base-agnostic (works at any deployment path without
 *     build-time rewriting).
 *   - Injects a client plugin that calls {@link connectDevframe} once on
 *     page load and exposes the RPC client via `useNuxtApp().$rpc`.
 *   - When `devframe` is provided and Nuxt is in dev mode, registers a
 *     Vite plugin (via `addVitePlugin(createVitePlugin(devframe, {
 *     devMiddleware: ... }))`) that starts the RPC + WS bridge and
 *     serves `${baseURL}__connection.json`.
 *
 * ```ts [nuxt.config.ts]
 * import devframe from './src/devframe' // defineDevframe(...) export
 *
 * export default defineNuxtConfig({
 *   modules: [['@devframes/nuxt', { devframe }]],
 * })
 * ```
 *
 * At the call site:
 *
 * ```ts [composables/payload.ts]
 * export async function fetchPayload() {
 *   const { $rpc } = useNuxtApp()
 *   return $rpc.call('my-tool:get-payload')
 * }
 * ```
 */
export default defineNuxtModule<DevframeNuxtModuleOptions>({
  meta: {
    name: 'devframe',
    configKey: 'devframe',
  },
  defaults: {
    baseURL: './',
    skipAppDefaults: false,
    devMiddleware: true,
  },
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    if (!options.skipAppDefaults) {
      // Relative app baseURL so the production SSG output resolves
      // assets against `document.baseURI`. Leaves explicit overrides
      // alone — authors who set these already are in charge.
      nuxt.options.app ??= {} as any
      nuxt.options.app.baseURL ??= './'
      nuxt.options.vite ??= {}
      ;(nuxt.options.vite as any).base ??= './'
    }

    // Expose the resolved baseURL to the runtime plugin via Nuxt's
    // `runtimeConfig.public` so it survives a Nitro static build.
    nuxt.options.runtimeConfig ??= {} as any
    nuxt.options.runtimeConfig.public ??= {} as any
    const publicConfig = nuxt.options.runtimeConfig.public as Record<string, any>
    publicConfig.devframe = {
      ...(publicConfig.devframe ?? {}),
      baseURL: options.baseURL,
    }

    addPlugin({
      src: resolve('./runtime/plugin.client'),
      mode: 'client',
    })

    // Dev-time RPC bridge. Skipped without a definition or when the
    // user opts out; `apply: 'serve'` on the inner Vite plugin is a
    // second guard against accidental activation during build.
    if (options.devframe && options.devMiddleware !== false && nuxt.options.dev) {
      const mw = options.devMiddleware === true || options.devMiddleware === undefined
        ? {}
        : options.devMiddleware
      const host = mw.host
        ?? (nuxt.options.devServer as any)?.host
        ?? options.devframe.cli?.host

      addVitePlugin(createVitePlugin(options.devframe, {
        base: options.baseURL ?? './',
        devMiddleware: {
          port: mw.port,
          host,
          flags: mw.flags,
        },
      }) as any)
    }
  },
})
