<script setup lang="ts">
import type { DevToolsDockState } from '../webcomponents/components/DockProps'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { useLocalStorage } from '@vueuse/core'
import { computed, markRaw, ref, useTemplateRef, watchEffect } from 'vue'
import Dock from '../webcomponents/components/Dock.vue'
import { IframeManager } from '../webcomponents/components/IframeManager'
import ViewEntry from '../webcomponents/components/ViewEntry.vue'

const { rpc } = await getDevToolsRpcClient()

// eslint-disable-next-line no-console
console.log('[VITE DEVTOOLS] RPC', rpc)

const docks = await rpc['vite:core:list-dock-entries']()
// eslint-disable-next-line no-console
console.log('[VITE DEVTOOLS] Docks', docks)

const state = useLocalStorage<DevToolsDockState>(
  'vite-devtools-dock-state',
  {
    width: 80,
    height: 80,
    top: 0,
    left: 0,
    position: 'left',
    open: false,
    minimizePanelInactive: 3_000,
  },
  { mergeDefaults: true },
)

const iframes = markRaw(new IframeManager())
const iframesContainer = useTemplateRef<HTMLDivElement>('iframesContainer')

watchEffect(() => {
  iframes.setContainer(iframesContainer.value!)
}, { flush: 'sync' })

const isDragging = ref(false)
const entry = computed(() => state.value.dockEntry || docks[0])
</script>

<template>
  <div id="iframes-container" ref="iframesContainer" />
  <Dock
    v-model:is-dragging="isDragging"
    :state="state"
    :docks="docks"
  />
  <ViewEntry
    v-if="entry && iframesContainer"
    :key="entry.id"
    :state="state"
    :entry="entry"
    :is-dragging="isDragging"
    :is-resizing="false"
    :iframes="iframes"
  />
</template>
