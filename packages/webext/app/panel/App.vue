<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { CLIENT_CONTEXT_KEY, getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { createDocksContext, DockStandalone } from '@vitejs/devtools/client/webcomponents'
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { getInspectedWindowMetadata } from './inspected-window'

const context = ref<DocksContext | null>(null)
const errorMessage = ref<string | null>(null)
const status = ref<'loading' | 'unavailable'>('loading')
const dockRoot = useTemplateRef<HTMLElement>('dockRoot')
const METADATA_RETRY_COUNT = 50
const METADATA_RETRY_DELAY = 100

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

watch([dockRoot, context], ([root, docksContext]) => {
  if (!root || !docksContext || root.childElementCount)
    return

  root.appendChild(new DockStandalone({ context: docksContext }))
})

const statusText = computed(() => {
  return status.value === 'loading'
    ? 'Connecting to Vite DevTools...'
    : 'Vite DevTools unavailable'
})

async function resolveInspectedWindowMetadata() {
  for (let i = 0; i < METADATA_RETRY_COUNT; i++) {
    const meta = await getInspectedWindowMetadata()
    if (meta)
      return meta

    await sleep(METADATA_RETRY_DELAY)
  }
}

async function initialize() {
  status.value = 'loading'
  errorMessage.value = null

  try {
    const meta = await resolveInspectedWindowMetadata()
    if (!meta)
      throw new Error('Unable to reconnect to the inspected page.')

    const rpc = await getDevToolsRpcClient({
      authToken: meta.authToken,
      connectionMeta: meta.connectionMeta,
      wsOptions: {
        url: meta.wsUrl,
      },
    })

    const docksContext = await createDocksContext('standalone', rpc)
    docksContext.runtime.appOrigin = meta.origin
    context.value = docksContext
    ;(globalThis as any)[CLIENT_CONTEXT_KEY] = context.value
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
  <div v-if="context" ref="dockRoot" class="h-screen w-screen" />
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
