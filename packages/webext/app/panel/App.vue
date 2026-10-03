<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getInspectedWindowConnection } from './inspected-window'

const viewerUrl = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const status = ref<'loading' | 'unavailable'>('loading')
const METADATA_RETRY_COUNT = 200
const METADATA_RETRY_DELAY = 100

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const statusText = computed(() => {
  return status.value === 'loading'
    ? 'Connecting to Vite DevTools...'
    : 'Vite DevTools unavailable'
})

async function resolveInspectedWindowConnection() {
  for (let i = 0; i < METADATA_RETRY_COUNT; i++) {
    const connection = await getInspectedWindowConnection()
    if (connection)
      return connection

    await sleep(METADATA_RETRY_DELAY)
  }
}

async function initialize() {
  status.value = 'loading'
  errorMessage.value = null

  try {
    const connection = await resolveInspectedWindowConnection()
    if (!connection)
      throw new Error('Unable to reconnect to the inspected page.')

    viewerUrl.value = new URL('./', connection.metaBaseUrl).href
  }
  catch (err) {
    status.value = 'unavailable'
    errorMessage.value = err instanceof Error ? err.message : String(err)
  }
}

function handleInspectedWindowNavigated() {
  location.reload()
}

onMounted(() => {
  chrome.devtools.network.onNavigated.addListener(handleInspectedWindowNavigated)
  initialize()
})

onUnmounted(() => {
  chrome.devtools.network.onNavigated.removeListener(handleInspectedWindowNavigated)
})
</script>

<template>
  <iframe
    v-if="viewerUrl"
    :src="viewerUrl"
    title="Vite DevTools"
    class="h-screen w-screen border-0"
  />
  <div v-else class="h-screen w-screen flex items-center justify-center bg-[#1e1e1e] px-4 py-3 text-center text-[#cccccc]">
    <div>
      <p class="m0 text-base">
        {{ statusText }}
      </p>
      <p v-if="status === 'unavailable'" class="mb0 mt1 text-sm text-[#999999]">
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>
