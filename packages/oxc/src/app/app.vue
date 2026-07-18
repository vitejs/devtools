<script setup lang="ts">
import { connect, connectionState } from './composables/rpc'
import 'floating-vue/dist/style.css'
import './assets/css/main.css'
import '@vitejs/devtools-ui/composables/dark'

connect()
</script>

<template>
  <div v-if="connectionState.error" class="text-red">
    {{ connectionState.error }}
  </div>
  <VisualLoading v-else-if="!connectionState.connected" text="Connecting..." />
  <NuxtPage v-else />
</template>
