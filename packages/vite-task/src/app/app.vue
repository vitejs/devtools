<script setup lang="ts">
import { applyDarkClassToHtml } from '@vitejs/devtools-ui/composables/dark'
import { useSeoMeta } from '#app/composables/head'
import { connect, connectionState } from './composables/rpc'
import './styles/global.css'

applyDarkClassToHtml()

useSeoMeta({
  title: 'Vite Task DevTools',
})

connect()
</script>

<template>
  <div v-if="connectionState.error" class="text-red p4">
    {{ connectionState.error }}
  </div>
  <div v-else-if="!connectionState.connected" class="p4 op50">
    Connecting...
  </div>
  <div v-else class="h-vh">
    <NuxtPage />
  </div>
</template>
