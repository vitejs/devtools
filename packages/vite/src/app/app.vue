<script setup lang="ts">
import { useHead } from '#app/composables/head'

import VisualLoading from '@vitejs/devtools-ui/components/VisualLoading.vue'
import { connect, connectionState } from './composables/rpc'
import 'floating-vue/dist/style.css'
import './styles/cm.css'
import './styles/splitpanes.css'
import './styles/global.css'
import './composables/dark'

useHead({
  title: 'Vite DevTools',
})

connect()
</script>

<template>
  <div v-if="connectionState.error" text-red>
    {{ connectionState.error }}
  </div>
  <VisualLoading
    v-else-if="!connectionState.connected"
    text="Connecting..."
  />
  <div v-else h-vh>
    <NuxtPage />
  </div>
</template>
