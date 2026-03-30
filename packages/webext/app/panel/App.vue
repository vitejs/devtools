<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { CLIENT_CONTEXT_KEY, getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { createDocksContext, DockStandalone } from '@vitejs/devtools/client/webcomponents'
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import { getInspectedWindowMetadata } from './inspected-window'

const context = ref<DocksContext | null>(null)
const error = ref<string | null>(null)
const dockRoot = useTemplateRef<HTMLElement>('dockRoot')

watch([dockRoot, context], ([root, docksContext]) => {
  if (!root || !docksContext || root.childElementCount)
    return

  root.appendChild(new DockStandalone({ context: docksContext }))
})

try {
  const meta = await getInspectedWindowMetadata()

  const rpc = await getDevToolsRpcClient({
    authToken: meta.authToken,
    connectionMeta: meta.connectionMeta,
    wsOptions: {
      url: meta.wsUrl,
    },
  })

  context.value = await createDocksContext('standalone', rpc)
  ;(globalThis as any)[CLIENT_CONTEXT_KEY] = context.value
  await nextTick()
}
catch (err) {
  error.value = err instanceof Error ? err.message : String(err)
}
</script>

<template>
  <div v-if="context" ref="dockRoot" class="h-screen w-screen" />
  <div v-else class="h-screen w-screen flex items-center justify-center bg-[#0b1120] px-6 text-white/80">
    <div class="max-w-lg rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-6 shadow-xl">
      <p class="m0 text-base font-semibold text-white">
        Vite DevTools panel unavailable
      </p>
      <p class="mb0 mt2">
        {{ error || 'Connecting to the inspected page...' }}
      </p>
    </div>
  </div>
</template>
