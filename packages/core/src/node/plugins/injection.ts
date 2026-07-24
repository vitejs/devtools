import type { Plugin } from 'vite'
import process from 'node:process'
import { join, normalize } from 'pathe'
import { dirDist } from '../../dirs'
import { isNormalModeEnabled } from '../passive-mode'

export type DevToolsVisibility = 'passive' | 'normal' | 'hidden'

export interface DevToolsInjectionOptions {
  /**
   * Initial visibility of the injected overlay.
   *
   * - `'passive'` — docks hidden until the shortcut; revealing is remembered
   *   for the project (unless already opted into normal mode).
   * - `'normal'` — docks shown immediately.
   * - `'hidden'` — docks hidden; the shortcut reveals them for the current
   *   session only, every load.
   *
   * @default 'passive'
   */
  visibility?: DevToolsVisibility
}

// One virtual module per client entry; each statically imports its entry, so
// the modules themselves are cacheable and the per-request choice lives in
// `transformIndexHtml`.
const ENTRY_BY_MODE = {
  normal: 'inject',
  passive: 'inject-passive',
  hidden: 'inject-hidden',
} as const

type EntryMode = keyof typeof ENTRY_BY_MODE

function virtualId(mode: EntryMode): string {
  return `virtual:vite-devtools-injection:${mode}`
}

function resolveDevToolsInjectionEntry(mode: EntryMode): string {
  const name = ENTRY_BY_MODE[mode]
  return process.env.VITE_DEVTOOLS_LOCAL_DEV
    ? normalize(join(dirDist, '..', `src/client/${name}/index.ts`))
    : normalize(join(dirDist, `client/${name}.js`))
}

export function DevToolsInjection(options: DevToolsInjectionOptions = {}): Plugin {
  const visibility = options.visibility ?? 'passive'
  let root = process.cwd()

  // Resolve which client entry to inject. `normal` and `hidden` are fixed;
  // `passive` upgrades to `normal` once the project has opted in.
  const resolveMode = (): EntryMode => {
    if (visibility === 'normal')
      return 'normal'
    if (visibility === 'hidden')
      return 'hidden'
    return isNormalModeEnabled(root) ? 'normal' : 'passive'
  }

  return {
    name: 'vite:devtools:injection',
    enforce: 'post',
    apply(_config, env) {
      return env.command === 'serve' && !env.isSsrBuild
    },
    configResolved(config) {
      root = config.root
    },
    transformIndexHtml: {
      order: 'pre',
      // Resolved per HTML request (not cached), so activating or hiding the
      // docks — which flips the persisted flag — takes effect on the next load.
      handler() {
        return [
          {
            tag: 'script',
            attrs: {
              type: 'module',
            },
            children: `import ${JSON.stringify(virtualId(resolveMode()))}`,
            injectTo: 'body',
          },
        ]
      },
    },
    resolveId(id) {
      for (const mode of Object.keys(ENTRY_BY_MODE) as EntryMode[]) {
        if (id === virtualId(mode))
          return `\0${id}`
      }
    },
    load(id) {
      for (const mode of Object.keys(ENTRY_BY_MODE) as EntryMode[]) {
        if (id === `\0${virtualId(mode)}`)
          return `import(${JSON.stringify(resolveDevToolsInjectionEntry(mode))})\n`
      }
    },
  }
}
