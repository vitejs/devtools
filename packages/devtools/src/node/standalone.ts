import process from 'node:process'
import { getPort } from 'get-port-please'
import { loadConfigFromFile, resolveConfig } from 'vite'
import { resolveDevtoolsConfig } from './server'

export interface StandaloneDevToolsOptions {
  cwd?: string
  port?: number
}

export async function startStandaloneDevTools(options: StandaloneDevToolsOptions = {}): Promise<void> {
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

  console.log({ context })

  const _port = options.port ?? await getPort({ port: 7812, random: true })
}
