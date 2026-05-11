import type { DevToolsNodeContext, StartedServer } from 'devframe/node'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  DEVTOOLS_CONNECTION_META_FILENAME,
} from 'devframe/constants'
import {
  createH3DevToolsHost,
  createHostContext,
  startHttpAndWs,
} from 'devframe/node'
import { serveStaticHandler } from 'devframe/utils/serve-static'
import { getPort } from 'get-port-please'
import { createApp, eventHandler } from 'h3'
import { resolve } from 'pathe'
import devframe from '../src/devframe'

const HERE = fileURLToPath(new URL('.', import.meta.url))
export const CLIENT_DIST = resolve(HERE, '../dist/client')

/**
 * Boot the streaming-chat server in-process for tests. Mirrors the
 * cli adapter wiring so the WS+HTTP path is exercised end-to-end.
 *
 * Bound to 127.0.0.1 to avoid the IPv4/IPv6 race documented in
 * `packages/devframe/src/rpc/transports/ws.test.ts`.
 */
export async function startStreamingChatServer(): Promise<StartedServer & {
  basePath: string
  ctx: DevToolsNodeContext
}> {
  // Build the client only if a test exercises the served HTML — RPC-only
  // tests don't need the dist (we don't call assertClientBuilt unless the
  // test fetches index.html).
  const distDir = devframe.cli!.distDir!
  const basePath = devframe.basePath!
  const host = '127.0.0.1'
  const port = await getPort({ host, random: true })

  const app = createApp()
  const origin = `http://${host}:${port}`
  const h3Host = createH3DevToolsHost({
    origin,
    appName: devframe.id,
    mount: (base, dir) =>
      app.use(base, serveStaticHandler(dir)),
  })

  const ctx = await createHostContext({ cwd: process.cwd(), mode: 'dev', host: h3Host })
  await devframe.setup(ctx)

  const metaPath = `${basePath}${DEVTOOLS_CONNECTION_META_FILENAME}`
  app.use(
    metaPath,
    eventHandler((event) => {
      event.node.res.setHeader('Content-Type', 'application/json')
      return event.node.res.end(
        JSON.stringify({ backend: 'websocket', websocket: port }),
      )
    }),
  )
  if (existsSync(path.join(resolve(distDir), 'index.html'))) {
    app.use(basePath, serveStaticHandler(resolve(distDir)))
  }

  const server = await startHttpAndWs({
    context: ctx,
    host,
    port,
    app,
    auth: false,
  })

  return Object.assign(server, { basePath, ctx })
}
