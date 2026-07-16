<script setup lang="ts">
import { connect, connectionState } from './composables/rpc'
import 'floating-vue/dist/style.css'
import './assets/css/main.css'
import '@vitejs/devtools-ui/composables/dark'

connect()
</script>

<template>
  <div v-if="connectionState.error" text-red>
    {{ connectionState.error }}
  </div>
  <VisualLoading v-else-if="!connectionState.connected" text="Connecting..." />
  <main v-else container mx-auto p4>
    <NuxtPage />
  </main>
</template>
