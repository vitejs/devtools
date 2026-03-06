<script setup lang="ts">
import { useHead } from '#app/composables/head'
import './styles/global.css'
import '@vitejs/devtools-ui/composables/dark'

useHead({
  title: 'Vite DevTools',
})

const connected = false
</script>

<template>
  <VisualLoading
    v-if="!connected"
    text="Coming Soon..."
  />
  <div v-else h-vh>
    <NuxtPage />
  </div>
</template>
