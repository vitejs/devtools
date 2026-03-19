<script setup lang="ts">
import { useHead } from '#app/composables/head'
import PanelSideNav from '@vitejs/devtools-ui/components/PanelSideNav.vue'
import { useSideNav } from '@vitejs/devtools-ui/composables/nav'
import { connect, rpcConnectionState } from './composables/rpc'
import './styles/global.css'
import '@vitejs/devtools-ui/composables/dark'
import 'floating-vue/dist/style.css'

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
