/// <reference types="vite/client" />
/// <reference lib="dom" />

import type { ConnectionMeta } from '@vitejs/devtools-kit'
import type { ServerFunctions } from '../../../devtools-vite/src/node/rpc'
import type { ClientFunctions } from '../../../devtools-vite/src/shared/types/vite'
import { createRpcClient } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'

// eslint-disable-next-line no-console
console.log('[VITE DEVTOOLS] Client injected')

function isNumeric(str: string | number) {
  return `${+str}` === `${str}`
}

export async function init(): Promise<void> {
  const metadata = await fetch('/__vite_devtools__/api/metadata.json')
    .then(r => r.json()) as ConnectionMeta

  const url = isNumeric(metadata.websocket)
    ? `${location.protocol.replace('http', 'ws')}//${location.hostname}:${metadata.websocket}`
    : metadata.websocket as string

  const rpc = createRpcClient<ServerFunctions, ClientFunctions>({}, {
    preset: createWsRpcPreset({
      url,
    }),
  })

  // eslint-disable-next-line no-console
  console.log('[VITE DEVTOOLS] RPC', rpc)
}

init()
