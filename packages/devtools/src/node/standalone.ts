import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ResolvedConfig } from 'vite'
import process from 'node:process'
import { loadConfigFromFile, resolveConfig } from 'vite'
import { createDevToolsContext } from './context'

export interface StandaloneDevToolsOptions {
  cwd?: string
  port?: number
  config?: string
  command?: 'build' | 'serve'
  mode?: 'development' | 'production'
}

export async function startStandaloneDevTools(options: StandaloneDevToolsOptions = {}): Promise<{
  config: ResolvedConfig
  context: DevToolsNodeContext
}> {
  const {
    cwd = process.cwd(),
    command = 'build',
    mode = 'production',
  } = options

  const loaded = await loadConfigFromFile(
    {
      command,
      mode,
    },
    options.config,
    cwd,
  )

  const resolved = await resolveConfig(
    loaded?.config || {},
    command,
    mode,
  )

  const context = await createDevToolsContext(resolved)

  return {
    config: resolved,
    context,
  }
}
