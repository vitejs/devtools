import type { DevToolsSetupContext } from '@vitejs/devtools-kit'
import type { ResolvedConfig } from 'vite'
import process from 'node:process'
import { loadConfigFromFile, resolveConfig } from 'vite'
import { resolveDevtoolsConfig } from './server'

export interface StandaloneDevToolsOptions {
  cwd?: string
  port?: number
}

export async function startStandaloneDevTools(options: StandaloneDevToolsOptions = {}): Promise<{
  config: ResolvedConfig
  context: DevToolsSetupContext
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

  const context = await resolveDevtoolsConfig(resolved)

  return {
    config: resolved,
    context,
  }
}
