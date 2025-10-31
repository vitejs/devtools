import type { Plugin } from 'vite'
import { DevToolsInjection } from './injection'
import { DevToolsServer } from './server'

export interface DevToolsOptions {
  /**
   * Include the Vite builtin devtools UI.
   *
   * @default true
   */
  builtinDevTools?: boolean
}

export async function DevTools(options: DevToolsOptions = {}): Promise<Plugin[]> {
  const {
    builtinDevTools = true,
  } = options

  const plugins = [
    DevToolsInjection(),
    DevToolsServer(),
  ]

  if (builtinDevTools) {
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-ignore ignore the type error
    plugins.push(await import('@vitejs/devtools-vite').then(m => m.DevToolsViteUI()))
  }

  return plugins
}

export {
  DevToolsInjection,
  DevToolsServer,
}
