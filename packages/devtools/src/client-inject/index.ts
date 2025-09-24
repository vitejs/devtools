/// <reference types="vite/client" />
/// <reference lib="dom" />

import type { ConnectionMeta, DevtoolsRpcClientFunctions, DevtoolsRpcServerFunctions } from '@vitejs/devtools-kit'
import { createRpcClient } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'
import { reactive } from 'vue'

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

  const rpc = createRpcClient<DevtoolsRpcServerFunctions, DevtoolsRpcClientFunctions>({}, {
    preset: createWsRpcPreset({
      url,
    }),
  })

  // eslint-disable-next-line no-console
  console.log('[VITE DEVTOOLS] RPC', rpc)

  const views = await rpc['vite:core:list-views']()
  console.log('[VITE DEVTOOLS] Views', views)

  const state = reactive({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    position: 'left',
    open: false,
    minimizePanelInactive: 3_000,
  })

  const { FloatingPanel } = await import('@vitejs/devtools/webcomponents')
  const floatingPanel = new FloatingPanel({
    state,
    views,
  })
  document.body.appendChild(floatingPanel)
}

init()
