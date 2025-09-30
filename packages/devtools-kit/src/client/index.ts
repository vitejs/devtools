import type { BirpcReturn } from 'birpc'
import type { ConnectionMeta, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '../types'
import { createRpcClient } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'

function isNumeric(str: string | number) {
  return `${+str}` === `${str}`
}

export async function getDevToolsRpc(baseURL = '/__vite_devtools__/api/'): Promise<BirpcReturn<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>> {
  const metadata = await fetch(`${baseURL}metadata.json`)
    .then(r => r.json()) as ConnectionMeta

  const url = isNumeric(metadata.websocket)
    ? `${location.protocol.replace('http', 'ws')}//${location.hostname}:${metadata.websocket}`
    : metadata.websocket as string

  const rpc = createRpcClient<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>({}, {
    preset: createWsRpcPreset({
      url,
    }),
  })

  return rpc
}
