import process from 'node:process'
import { getPort } from 'get-port-please'
import { loadConfigFromFile, resolveConfig } from 'vite'

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
  const resolved = await resolveConfig(loaded.config, 'build', 'development')

  const devtoolsPlugins = resolved.plugins.filter(plugin => 'devtools' in plugin)

  // console.log({ resolved, devtoolsPlugins })

  const _port = options.port ?? await getPort({ port: 7812, random: true })
}
