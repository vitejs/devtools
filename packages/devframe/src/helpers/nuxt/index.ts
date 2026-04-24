import { addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'

export interface DevframeNuxtModuleOptions {
  /**
   * Base URL, relative to the deployed page, at which the devframe
   * `.devtools/` directory will be served. Defaults to `'./.devtools/'`
   * so a single build works at any deployment base (the browser
   * resolves relative fetches against `document.baseURI`).
   */
  baseURL?: string
  /**
   * Disable the opinionated Nuxt app defaults (`app.baseURL: './'`,
   * `vite.base: './'`). Set to `true` if you need to own these yourself.
   * Defaults to `false` — devframe sets sensible base-agnostic defaults.
   */
  skipAppDefaults?: boolean
}

/**
 * Nuxt module that wires a Nuxt-built SPA up as a devframe client:
 *
 *   - Sets `app.baseURL: './'` + `vite.base: './'` so the production
 *     build is base-agnostic (works at any deployment path without
 *     build-time rewriting).
 *   - Injects a client plugin that calls {@link connectDevtool} once on
 *     page load and exposes the RPC client via `useNuxtApp().$rpc`.
 *
 * ```ts [nuxt.config.ts]
 * export default defineNuxtConfig({
 *   modules: ['devframe/helpers/nuxt'],
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
    baseURL: './.devtools/',
    skipAppDefaults: false,
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
  },
})
