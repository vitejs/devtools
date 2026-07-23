import type { Plugin } from 'vite'
import process from 'node:process'
import { join, normalize } from 'pathe'
import { dirDist } from '../../dirs'
import { isPassive } from '../passive-mode'

export interface DevToolsInjectionOptions {
  /**
   * Initial visibility of the injected overlay. `'passive'` injects the
   * passive client (docks hidden until the shortcut) unless the project has
   * already opted into normal mode; `'normal'` always injects the normal client.
   *
   * @default 'passive'
   */
  visibility?: 'passive' | 'normal'
}

const DEVTOOLS_INJECTION_VIRTUAL_ID = 'virtual:vite-devtools-injection'
const DEVTOOLS_INJECTION_PASSIVE_VIRTUAL_ID = 'virtual:vite-devtools-injection-passive'

const RESOLVED_DEVTOOLS_INJECTION_VIRTUAL_ID = `\0${DEVTOOLS_INJECTION_VIRTUAL_ID}`
const RESOLVED_DEVTOOLS_INJECTION_PASSIVE_VIRTUAL_ID = `\0${DEVTOOLS_INJECTION_PASSIVE_VIRTUAL_ID}`

function resolveDevToolsInjectionEntry(passive: boolean): string {
  const local = passive ? 'src/client/inject-passive/index.ts' : 'src/client/inject/index.ts'
  const dist = passive ? 'client/inject-passive.js' : 'client/inject.js'
  return process.env.VITE_DEVTOOLS_LOCAL_DEV
    ? normalize(join(dirDist, '..', local))
    : normalize(join(dirDist, dist))
}

export function DevToolsInjection(options: DevToolsInjectionOptions = {}): Plugin {
  const visibility = options.visibility ?? 'passive'
  let root = process.cwd()
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
        const virtualId = isPassive(root, visibility !== 'normal')
          ? DEVTOOLS_INJECTION_PASSIVE_VIRTUAL_ID
          : DEVTOOLS_INJECTION_VIRTUAL_ID
        return [
          {
            tag: 'script',
            attrs: {
              type: 'module',
            },
            children: `import ${JSON.stringify(virtualId)}`,
            injectTo: 'body',
          },
        ]
      },
    },
    resolveId(id) {
      if (id === DEVTOOLS_INJECTION_VIRTUAL_ID)
        return RESOLVED_DEVTOOLS_INJECTION_VIRTUAL_ID
      if (id === DEVTOOLS_INJECTION_PASSIVE_VIRTUAL_ID)
        return RESOLVED_DEVTOOLS_INJECTION_PASSIVE_VIRTUAL_ID
    },
    load(id) {
      if (id === RESOLVED_DEVTOOLS_INJECTION_VIRTUAL_ID)
        return `import(${JSON.stringify(resolveDevToolsInjectionEntry(false))})\n`
      if (id === RESOLVED_DEVTOOLS_INJECTION_PASSIVE_VIRTUAL_ID)
        return `import(${JSON.stringify(resolveDevToolsInjectionEntry(true))})\n`
    },
  }
}
