import type { CreateWsServerOptions } from './ws'
import { createApp, eventHandler, fromNodeMiddleware, toNodeListener } from 'h3'
import sirv from 'sirv'
import { dirClientStandalone } from '../dirs'
import { createWsServer } from './ws'

export async function createDevToolsMiddleware(options: CreateWsServerOptions) {
  const app = createApp()

  const { rpc, getMetadata } = await createWsServer(options)

  app.use('/.vdt-connection.json', eventHandler(async (event) => {
    event.node.res.setHeader('Content-Type', 'application/json')
    return event.node.res.end(JSON.stringify(await getMetadata()))
  }))

  app.use(fromNodeMiddleware(sirv(dirClientStandalone, {
    dev: true,
    single: true,
  })))

  return {
    h3: app,
    middleware: toNodeListener(app),
    rpc,
  }
}
