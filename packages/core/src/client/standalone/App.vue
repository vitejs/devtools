<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import DockStandalone from '../webcomponents/components/DockStandalone.vue'
import { createDocksContext } from '../webcomponents/state/context'

const rpc = await getDevToolsRpcClient()

// eslint-disable-next-line no-console
console.log('[VITE DEVTOOLS] RPC', rpc)

const context: DocksContext = await createDocksContext(
  'standalone',
  rpc,
)
</script>

<template>
  <DockStandalone :context />
</template>
