import type { Plugin } from 'vite'
import process from 'node:process'
import { join, normalize } from 'pathe'
import { dirDist } from '../../dirs'

const DEVTOOLS_INJECTION_VIRTUAL_ID = 'virtual:vite-devtools-injection'

const RESOLVED_DEVTOOLS_INJECTION_VIRTUAL_ID = `\0${DEVTOOLS_INJECTION_VIRTUAL_ID}`

function resolveDevToolsInjectionEntry(): string {
  return process.env.VITE_DEVTOOLS_LOCAL_DEV
    ? normalize(join(dirDist, '..', 'src/client/inject/index.ts'))
    : normalize(join(dirDist, 'client/inject.js'))
}

export function DevToolsInjection(): Plugin {
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
              type: 'module',
            },
            children: `import ${JSON.stringify(DEVTOOLS_INJECTION_VIRTUAL_ID)}`,
            injectTo: 'body',
          },
        ]
      },
    },
    resolveId(id) {
      if (id === DEVTOOLS_INJECTION_VIRTUAL_ID) {
        return RESOLVED_DEVTOOLS_INJECTION_VIRTUAL_ID
      }
    },
    load(id) {
      if (id === RESOLVED_DEVTOOLS_INJECTION_VIRTUAL_ID) {
        return `import(${JSON.stringify(resolveDevToolsInjectionEntry())})\n`
      }
    },
  }
}
