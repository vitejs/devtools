// import { join } from 'node:path'
// import process from 'node:process'

// import { RpcFunctionsHost } from '@vitejs/devtools'
// import { consola } from 'consola'
import { defineEventHandler } from 'h3'
// import { RolldownLogsManager } from '../../../../node/rolldown/logs-manager'
// import { createWsServer } from '../../../../node/ws'

// consola.restoreAll()

// async function run() {
//   const ws = await createWsServer({
//     cwd: process.cwd(),
//     mode: 'dev',
//     functions: new RpcFunctionsHost(),
//     meta: {
//       manager: new RolldownLogsManager(join(process.cwd(), '.rolldown')),
//     },
//   })

//   // Warm up the payload
//   setTimeout(() => {
//     ws.serverFunctions['vite:get-payload']()
//   }, 1)

//   return ws
// }

// const ws = run()

export default defineEventHandler(async () => {
  return {}
  // return await (await ws).getMetadata()
})
