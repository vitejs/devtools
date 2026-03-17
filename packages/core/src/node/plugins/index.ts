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
  /**
   * Use a fixed auth id for all clients connecting to the devtools.
   */
  authId?: string
}

export async function DevTools(options: DevToolsOptions = {}): Promise<Plugin[]> {
  const {
    builtinDevTools = true,
    authId,
  } = options

  const plugins = [
    DevToolsInjection(),
    DevToolsServer({ authId }),
  ]

  if (builtinDevTools) {
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-ignore ignore the type error
    plugins.push(await import('@vitejs/devtools-rolldown').then(m => m.DevToolsRolldownUI()))
  }

  return plugins
}

export {
  DevToolsInjection,
  DevToolsServer,
}
