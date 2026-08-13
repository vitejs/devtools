import type { Plugin } from 'vite'
import { DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'

export type DevToolsVisibility = 'passive' | 'normal' | 'hidden'

export interface DevToolsInjectionOptions {
  /**
   * Initial visibility of the injected overlay, forwarded to the
   * `@devframes/hub-ui` embedded bootstrap as a `data-visibility` hint.
   *
   * @default 'normal'
   */
  visibility?: DevToolsVisibility
}

/**
 * Inject the `@devframes/hub-ui` embedded bootstrap into the host app's HTML.
 * The hub serves the prebuilt, self-contained module at `<base>embedded.js`
 * (the `ui.embedded` slot), so injection is a single external `<script>` tag
 * — the client bundles its own framework and styles and owns its visibility
 * policy, so the host app's build never processes it.
 */
export function DevToolsInjection(options: DevToolsInjectionOptions = {}): Plugin {
  const visibility = options.visibility ?? 'normal'

  return {
    name: 'vite:devtools:injection',
    enforce: 'post',
    apply(_config, env) {
      return env.command === 'serve' && !env.isSsrBuild
    },
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          {
            tag: 'script',
            attrs: {
              'type': 'module',
              'src': `${DEVTOOLS_MOUNT_PATH}embedded.js`,
              'data-visibility': visibility,
            },
            injectTo: 'body',
          },
        ]
      },
    },
  }
}
