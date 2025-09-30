import type { DevToolsNodeContext } from '@vitejs/devtools-kit'
import type { ResolvedConfig } from 'vite'
import process from 'node:process'
import { loadConfigFromFile, resolveConfig } from 'vite'
import { createDevToolsContext } from './context'

export interface StandaloneDevToolsOptions {
  cwd?: string
  port?: number
}

export async function startStandaloneDevTools(options: StandaloneDevToolsOptions = {}): Promise<{
  config: ResolvedConfig
  context: DevToolsNodeContext
}> {
  const {
    cwd = process.cwd(),
  } = options

  const loaded = await loadConfigFromFile(
    {
      command: 'build',
      mode: 'development',
    },
    undefined,
    cwd,
  )

  const resolved = await resolveConfig(loaded?.config || {}, 'build', 'development')

  const context = await createDevToolsContext(resolved)

  return {
    config: resolved,
    context,
  }
}
