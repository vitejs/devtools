<script setup lang="ts">
import { applyDarkClassToHtml } from '@vitejs/devtools-ui/composables/dark'
import { useSeoMeta } from '#app/composables/head'
import { connect, connectionState } from './composables/rpc'
import 'floating-vue/dist/style.css'
import './styles/global.css'

applyDarkClassToHtml()

useSeoMeta({
  title: 'Vite Task DevTools',
})

connect()
</script>

<template>
  <div v-if="connectionState.connected" class="of-auto h-screen max-h-screen relative bg-base color-base">
    <NuxtPage />
  </div>
  <div v-else-if="connectionState.error" role="alert" class="text-red p4">
    {{ connectionState.error }}
  </div>
  <div v-else role="status" class="p4 op50">
    Connecting...
  </div>
</template>
