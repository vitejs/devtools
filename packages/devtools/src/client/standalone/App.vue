<script setup lang="ts">
import type { ConnectionMeta, DevToolsRpcClientFunctions, DevToolsRpcServerFunctions } from '@vitejs/devtools-kit'
import { createRpcClient } from '@vitejs/devtools-rpc'
import { createWsRpcPreset } from '@vitejs/devtools-rpc/presets/ws/client'
import { useLocalStorage } from '@vueuse/core'

function isNumber(str: string | number) {
  return `${+str}` === `${str}`
}

const metadata = await fetch('/__vite_devtools__/api/metadata.json')
  .then(r => r.json()) as ConnectionMeta

const url = isNumber(metadata.websocket)
  ? `${location.protocol.replace('http', 'ws')}//${location.hostname}:${metadata.websocket}`
  : metadata.websocket as string

const rpc = createRpcClient<DevToolsRpcServerFunctions, DevToolsRpcClientFunctions>({}, {
  preset: createWsRpcPreset({
    url,
  }),
})

// eslint-disable-next-line no-console
console.log('[VITE DEVTOOLS] RPC', rpc)

const docks = await rpc['vite:core:list-dock-entries']()
// eslint-disable-next-line no-console
console.log('[VITE DEVTOOLS] Docks', docks)

const state = useLocalStorage(
  'vite-devtools-dock-state',
  {
    width: 80,
    height: 80,
    top: 0,
    left: 0,
    position: 'left',
    open: false,
    minimizePanelInactive: 3_000,
  },
  { mergeDefaults: true },
)
</script>

<template>
  <div>
    <Dock :state="state" :docks="docks" />
  </div>
</template>
