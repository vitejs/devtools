<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { CLIENT_CONTEXT_KEY, getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { watchEffect } from 'vue'
import DockStandalone from '../webcomponents/components/dock/DockStandalone.vue'
import { isDark } from '../webcomponents/state/color-mode'
import { createDocksContext } from '../webcomponents/state/context'

// Standalone runs in the light DOM, so the page canvas (html) sits behind the
// full-screen shell — mirror the color mode onto it so its background and
// native controls follow the Auto/Light/Dark choice.
watchEffect(() => {
  const el = document.documentElement
  el.classList.toggle('dark', isDark.value)
  el.classList.toggle('light', !isDark.value)
  el.style.colorScheme = isDark.value ? 'dark' : 'light'
})

const rpc = await getDevToolsRpcClient()

// eslint-disable-next-line no-console
console.log('[VITE DEVTOOLS] RPC', rpc)

const context: DocksContext = await createDocksContext(
  'standalone',
  rpc,
)
;(globalThis as any)[CLIENT_CONTEXT_KEY] = context
</script>

<template>
  <DockStandalone :context />
</template>
