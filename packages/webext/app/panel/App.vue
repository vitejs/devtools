<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { createInspectedPageBridge } from './inspected-page'
import { getInspectedWindowConnection } from './inspected-window'

const viewerUrl = ref<string | null>(null)
const viewer = ref<HTMLIFrameElement>()
const errorMessage = ref<string | null>(null)
const status = ref<'loading' | 'unavailable'>('loading')
const METADATA_RETRY_COUNT = 200
const METADATA_RETRY_DELAY = 100
let generation = 0
let disposeBridge: (() => void) | undefined

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const statusText = computed(() => {
  return status.value === 'loading'
    ? 'Connecting to Vite DevTools...'
    : 'Vite DevTools unavailable'
})

async function resolveInspectedWindowConnection(currentGeneration: number) {
  for (let i = 0; i < METADATA_RETRY_COUNT; i++) {
    if (currentGeneration !== generation)
      return
    const connection = await getInspectedWindowConnection()
    if (connection)
      return connection

    await sleep(METADATA_RETRY_DELAY)
  }
}

async function initialize() {
  const currentGeneration = ++generation
  disposeBridge?.()
  disposeBridge = undefined
  viewerUrl.value = null
  status.value = 'loading'
  errorMessage.value = null

  try {
    const connection = await resolveInspectedWindowConnection(currentGeneration)
    if (currentGeneration !== generation)
      return
    if (!connection)
      throw new Error('Unable to reconnect to the inspected page.')

    const session = crypto.randomUUID()
    const url = new URL('./', connection.metaBaseUrl)
    url.searchParams.set('devframe-inspected-page', session)
    url.searchParams.set('devframe-parent-origin', location.origin)
    disposeBridge = createInspectedPageBridge({
      tabId: chrome.devtools.inspectedWindow.tabId,
      viewerUrl: url.href,
      session,
      getViewerWindow: () => viewer.value?.contentWindow,
      onError(message) {
        viewerUrl.value = null
        status.value = 'unavailable'
        errorMessage.value = message
      },
    })
    viewerUrl.value = url.href
  }
  catch (err) {
    status.value = 'unavailable'
    errorMessage.value = err instanceof Error ? err.message : String(err)
  }
}

function handleInspectedWindowNavigated() {
  initialize()
}

onMounted(() => {
  chrome.devtools.network.onNavigated.addListener(handleInspectedWindowNavigated)
  initialize()
})

onUnmounted(() => {
  generation++
  disposeBridge?.()
  chrome.devtools.network.onNavigated.removeListener(handleInspectedWindowNavigated)
})
</script>

<template>
  <iframe
    v-if="viewerUrl"
    ref="viewer"
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
