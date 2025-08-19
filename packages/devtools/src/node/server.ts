import type { DevToolsSetupContext } from '@vitejs/devtools-kit'
import type { Buffer } from 'node:buffer'
import type { ResolvedConfig } from 'vite'
import type { CreateWsServerOptions } from './ws'
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createApp, eventHandler, serveStatic, toNodeListener } from 'h3'
import { lookup } from 'mrmime'
import { join } from 'pathe'
import { distDir } from '../dirs'
import { RpcFunctionsHost } from './functions'
import { DevtoolsViewHost } from './views'
import { createWsServer } from './ws'

export async function resolveDevtoolsConfig(viteConfig: ResolvedConfig): Promise<DevToolsSetupContext> {
  const cwd = viteConfig.root

  const context: DevToolsSetupContext = {
    cwd,
    viteConfig,
    mode: viteConfig.command === 'serve' ? 'dev' : 'build',
    rpc: new RpcFunctionsHost(),
    views: new DevtoolsViewHost(),
  }

  const plugins = viteConfig.plugins.filter(plugin => 'devtools' in plugin)

  for (const plugin of plugins) {
    try {
      await plugin.devtools?.setup?.(context)
    }
    catch (error) {
      console.error(`[Vite DevTools] Error setting up plugin ${plugin.name}:`, error)
      throw error
    }
  }

  return context
}

export async function createDevtoolsMiddleware(options: CreateWsServerOptions) {
  const app = createApp()

  const { rpc, getMetadata } = await createWsServer(options)

  const fileMap = new Map<string, Promise<string | Buffer<ArrayBufferLike> | undefined>>()
  const readCachedFile = (id: string) => {
    if (!fileMap.has(id))
      fileMap.set(id, readFile(id).catch(() => undefined))
    return fileMap.get(id)
  }

  app.use('/api/metadata.json', eventHandler(async (event) => {
    event.node.res.setHeader('Content-Type', 'application/json')
    return event.node.res.end(JSON.stringify(await getMetadata()))
  }))

  app.use('/', eventHandler(async (event) => {
    const result = await serveStatic(event, {
      fallthrough: true,
      getContents: id => readCachedFile(join(distDir, id)),
      getMeta: async (id) => {
        const stats = await stat(join(distDir, id)).catch(() => {})
        if (!stats || !stats.isFile())
          return
        return {
          type: lookup(id),
          size: stats.size,
          mtime: stats.mtimeMs,
        }
      },
    })

    if (result === false)
      return readCachedFile(join(distDir, 'index.html'))
  }))

  return {
    middleware: toNodeListener(app),
    rpc,
  }
}

export async function startStandaloneServer(options: CreateWsServerOptions) {
  const { middleware, rpc } = await createDevtoolsMiddleware(options)

  const server = createServer(middleware)

  return {
    server,
    middleware,
    rpc,
  }
}
