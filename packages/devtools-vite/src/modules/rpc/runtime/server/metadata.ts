import { join } from 'node:path'
import process from 'node:process'

import { consola } from 'consola'
import { defineEventHandler } from 'h3'
import { RolldownLogsManager } from '../../../../node/rolldown/logs-manager'
import { createWsServer } from '../../../../node/ws'

consola.restoreAll()

const ws = createWsServer({
  cwd: process.cwd(),
  mode: 'dev',
  // TODO: redesign how the manager is passed
  meta: {
    manager: new RolldownLogsManager(join(process.cwd(), '.rolldown')),
  },
}).then((ws) => {
  // Warm up the payload
  setTimeout(() => {
    ws.serverFunctions['vite:get-payload']()
  }, 1)
  return ws
})

export default defineEventHandler(async () => {
  return await (await ws).getMetadata()
})
