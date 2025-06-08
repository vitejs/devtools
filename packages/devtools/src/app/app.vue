<script setup lang="ts">
import { useHead } from '#app/composables/head'
import { useNuxtApp } from '#app/nuxt'
import { useServerConnectionInfo } from './modules/rpc/runtime/composables/rpc'

import 'floating-vue/dist/style.css'
import './styles/cm.css'
import './styles/splitpanes.css'
import './styles/global.css'
import './composables/dark'

useHead({
  title: 'Vite DevTools',
})

const connectionInfo = useServerConnectionInfo()
const { $connectToServer } = useNuxtApp()
$connectToServer()
</script>

<template>
  <div v-if="connectionInfo.error" text-red>
    {{ connectionInfo.error }}
  </div>
  <div v-else-if="!connectionInfo.connected">
    Connecting...
  </div>
  <div v-else>
    <NuxtPage />
  </div>
</template>
