import process from 'node:process'
import { consola } from 'consola'

import { defineEventHandler } from 'h3'
import { createWsServer } from '../../../../../node/ws'

consola.restoreAll()

const ws = createWsServer({
  cwd: process.cwd(),
  mode: 'dev',
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
