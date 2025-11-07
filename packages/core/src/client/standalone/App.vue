<script setup lang="ts">
import type { DevToolsDockState } from '../webcomponents/components/DockProps'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import { useLocalStorage } from '@vueuse/core'
import { computed, markRaw, ref, shallowRef, useTemplateRef, watchEffect } from 'vue'
import DockEntries from '../webcomponents/components/DockEntries.vue'
import VitePlus from '../webcomponents/components/icons/VitePlus.vue'
import { IframeManager } from '../webcomponents/components/IframeManager'
import ViewEntry from '../webcomponents/components/ViewEntry.vue'
import { useStateHandlers } from '../webcomponents/state/state'

const { rpc } = await getDevToolsRpcClient()

// eslint-disable-next-line no-console
console.log('[VITE DEVTOOLS] RPC', rpc)

const docks = shallowRef(await rpc['vite:core:list-dock-entries']())
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
const entry = computed(() => state.value.dockEntry || docks.value[0])

const { selectDockEntry } = useStateHandlers(state, docks, rpc, 'standalone')
</script>

<template>
  <div class="h-screen w-screen of-hidden grid cols-[max-content_1fr]">
    <div class="border-r border-base flex flex-col">
      <div class="p2 border-b border-base flex">
        <VitePlus class="w-7 h-7 ma" />
      </div>
      <DockEntries
        :entries="docks"
        class="transition duration-200 p2"
        :is-vertical="false"
        :selected="state.dockEntry"
        @select="selectDockEntry"
      />
    </div>
    <div>
      <div id="iframes-container" ref="iframesContainer" />
      <ViewEntry
        v-if="entry && iframesContainer"
        :key="entry.id"
        :state="state"
        :entry="entry"
        :is-dragging="isDragging"
        :is-resizing="false"
        :iframes="iframes"
      />
    </div>
  </div>
</template>
