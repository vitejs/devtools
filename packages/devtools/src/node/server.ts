import type { CreateWsServerOptions } from './ws'
import { createServer } from 'node:http'
import { createApp, eventHandler, toNodeListener } from 'h3'
import { createWsServer } from './ws'

export async function createDevToolsMiddleware(options: CreateWsServerOptions) {
  const app = createApp()

  const { rpc, getMetadata } = await createWsServer(options)

  app.use('/api/connection.json', eventHandler(async (event) => {
    event.node.res.setHeader('Content-Type', 'application/json')
    return event.node.res.end(JSON.stringify(await getMetadata()))
  }))

  return {
    middleware: toNodeListener(app),
    rpc,
  }
}

export async function startStandaloneServer(options: CreateWsServerOptions) {
  const { middleware, rpc } = await createDevToolsMiddleware(options)

  const server = createServer(middleware)

  return {
    server,
    middleware,
    rpc,
  }
}
