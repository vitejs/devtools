import type { CreateWsServerOptions } from './ws'
import { createApp, eventHandler, fromNodeMiddleware, toNodeListener } from 'h3'
import sirv from 'sirv'
import { dirClientStandalone } from '../dirs'
import { createWsServer } from './ws'

export async function createDevToolsMiddleware(options: CreateWsServerOptions) {
  const h3 = createApp()

  const { rpc, getConnectionMeta } = await createWsServer(options)

  h3.use('/.vdt-connection.json', eventHandler(async (event) => {
    event.node.res.setHeader('Content-Type', 'application/json')
    return event.node.res.end(JSON.stringify(await getConnectionMeta()))
  }))

  h3.use(fromNodeMiddleware(sirv(dirClientStandalone, {
    dev: true,
    single: true,
  })))

  return {
    h3,
    rpc,
    middleware: toNodeListener(h3),
    getConnectionMeta,
  }
}
