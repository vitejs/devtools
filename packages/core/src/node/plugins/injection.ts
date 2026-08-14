import type { Plugin } from 'vite'
import { DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'

/**
 * Inject the `@devframes/hub-ui` embedded bootstrap into the host app's HTML.
 * The hub serves the prebuilt, self-contained module at `<base>embedded.js`
 * (the `ui.embedded` slot); the client bundles its own framework and styles
 * and reads its reveal policy and dock preferences from the connection meta
 * (`ConnectionMeta.configs.ui`, seeded by `createUi`), so the host app's build
 * never processes it.
 *
 * The bootstrap is loaded by an **inline** module that creates the `<script>`
 * element at runtime, rather than a static `<script type="module" src=…>`.
 * A static root-relative module `src` makes Vite try to pre-transform
 * `<base>embedded.js` through its own module pipeline — it isn't a project
 * file, so Vite logs a load error and (depending on version) can shadow the
 * hub-served module, which breaks the client's `import.meta.url`-relative
 * `branding.json` fetch (the dock then falls back to the default accent
 * instead of the Vite DevTools brand color). Injecting the element at runtime
 * keeps `<base>embedded.js` out of Vite's graph entirely, so the browser
 * fetches it straight from the hub with its real URL intact.
 */
export function DevToolsInjection(): Plugin {
  const src = `${DEVTOOLS_MOUNT_PATH}embedded.js`

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
            attrs: { type: 'module' },
            children: `const s = document.createElement('script'); s.type = 'module'; s.src = ${JSON.stringify(src)}; document.body.appendChild(s);`,
            injectTo: 'body',
          },
        ]
      },
    },
  }
}
