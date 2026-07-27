<script setup lang="ts">
import { applyDarkClassToHtml } from '@vitejs/devtools-ui/composables/dark'
import { useSeoMeta } from '#app/composables/head'

import { connect, connectionState } from './composables/rpc'
import 'floating-vue/dist/style.css'
import './styles/cm.css'
import './styles/splitpanes.css'
import './styles/global.css'

applyDarkClassToHtml()

useSeoMeta({
  title: 'Rolldown DevTools',
})

connect()
</script>

<template>
  <div v-if="connectionState.error" class="text-red">
    {{ connectionState.error }}
  </div>
  <VisualLoading
    v-else-if="!connectionState.connected"
    text="Connecting..."
  />
  <div v-else class="h-vh">
    <NuxtPage />
  </div>
</template>
