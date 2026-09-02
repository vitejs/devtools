<script setup lang="ts">
import PanelSideNav from '@vitejs/devtools-ui/components/Panel/PanelSideNav.vue'
import { applyDarkClassToHtml } from '@vitejs/devtools-ui/composables/dark'
import { useSideNav } from '@vitejs/devtools-ui/composables/nav'
import { useSeoMeta } from '#app/composables/head'
import { connect, rpcConnectionState } from './composables/rpc'
import 'floating-vue/dist/style.css'
import './styles/cm.css'
import './styles/splitpanes.css'
import './styles/global.css'

applyDarkClassToHtml()

useSeoMeta({
  title: 'Vite DevTools',
})

connect()

useSideNav(() => {
  return [
    {
      title: 'Home',
      icon: 'i-ph-house-duotone',
      to: '/home',
    },
    {
      title: 'HMR Inspector',
      icon: 'i-ph-lightning-duotone',
      to: '/hmr',
    },
    {
      title: 'Modules Graph',
      icon: 'i-ph-graph-duotone',
      to: '/graph',
    },
    {
      title: 'Plugins',
      icon: 'i-ph-plugs-duotone',
      to: '/plugins',
    },
  ]
})
</script>

<template>
  <div v-if="rpcConnectionState.error" class="text-red">
    {{ rpcConnectionState.error }}
  </div>
  <VisualLoading
    v-else-if="!rpcConnectionState.connected || rpcConnectionState.inspectStatus === 'checking'"
    text="Connecting..."
  />
  <div
    v-else-if="rpcConnectionState.inspectStatus === 'unavailable'"
    class="h-screen flex items-center justify-center p8"
  >
    <p class="text-base op50">
      Vite DevTools is only available in dev mode.
    </p>
  </div>
  <div v-else class="grid grid-cols-[max-content_1fr] h-screen w-screen max-w-screen max-h-screen of-hidden">
    <PanelSideNav />
    <div class="of-auto h-screen max-h-screen relative">
      <NuxtPage />
    </div>
  </div>
</template>
