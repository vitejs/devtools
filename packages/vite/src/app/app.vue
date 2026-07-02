<script setup lang="ts">
import PanelSideNav from '@vitejs/devtools-ui/components/PanelSideNav.vue'
import { useSideNav } from '@vitejs/devtools-ui/composables/nav'
import { useHead } from '#app/composables/head'
import { connect, rpcConnectionState } from './composables/rpc'
import 'floating-vue/dist/style.css'
import './styles/cm.css'
import './styles/splitpanes.css'
import './styles/global.css'
import '@vitejs/devtools-ui/composables/dark'

useHead({
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
  <div v-if="rpcConnectionState.error" text-red>
    {{ rpcConnectionState.error }}
  </div>
  <VisualLoading
    v-else-if="!rpcConnectionState.connected"
    text="Connecting..."
  />
  <div v-else grid="~ cols-[max-content_1fr]" h-screen w-screen max-w-screen max-h-screen of-hidden>
    <PanelSideNav />
    <div of-auto h-screen max-h-screen relative>
      <NuxtPage />
    </div>
  </div>
</template>
