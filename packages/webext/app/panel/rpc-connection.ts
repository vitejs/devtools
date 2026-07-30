import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'

const READY_STATUSES = new Set(['connected', 'unauthorized'])
const FAILED_STATUSES = new Set(['disconnected', 'error'])

function createConnectionError(rpc: DevToolsRpcClient): Error {
  return new Error(
    `Unable to connect to the Vite DevTools WebSocket (${rpc.status}).`,
    { cause: rpc.connectionError ?? undefined },
  )
}

export async function waitForRpcConnection(rpc: DevToolsRpcClient): Promise<void> {
  if (READY_STATUSES.has(rpc.status))
    return
  if (FAILED_STATUSES.has(rpc.status))
    throw createConnectionError(rpc)

  await new Promise<void>((resolve, reject) => {
    let unsubscribe: (() => void) | undefined
    const settle = (status: DevToolsRpcClient['status']) => {
      if (READY_STATUSES.has(status)) {
        unsubscribe?.()
        resolve()
      }
      else if (FAILED_STATUSES.has(status)) {
        unsubscribe?.()
        reject(createConnectionError(rpc))
      }
    }

    unsubscribe = rpc.events.on('connection:status', settle)
    settle(rpc.status)
  })
}
