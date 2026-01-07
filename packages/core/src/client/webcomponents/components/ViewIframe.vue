<script setup lang="ts">
import type { DevToolsViewIframe } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { CSSProperties } from 'vue'
import type { PersistedDomViewsManager } from '../utils/PersistedDomViewsManager'
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch, watchEffect } from 'vue'

const props = defineProps<{
  context: DocksContext
  entry: DevToolsViewIframe
  persistedDoms: PersistedDomViewsManager
  iframeStyle?: CSSProperties
}>()

const isLoading = ref(true)
const viewFrame = useTemplateRef<HTMLDivElement>('viewFrame')

// Get entry state for settings
const entryState = computed(() => props.context.docks.getStateById(props.entry.id))
const showAddressBar = computed(() => entryState.value?.settings.showAddressBar ?? false)

// Current URL (may differ from entry.url after navigation)
const currentUrl = ref(props.entry.url)

function refreshIframe() {
  const iframe = entryState.value?.domElements.iframe
  if (iframe) {
    const src = iframe.src
    iframe.src = ''
    setTimeout(() => {
      iframe.src = src
    }, 0)
  }
}

function openInNewTab() {
  window.open(currentUrl.value, '_blank')
}

onMounted(() => {
  const holder = props.persistedDoms.getOrCreateHolder(props.entry.id, 'iframe')
  holder.element.style.boxShadow = 'none'
  holder.element.style.outline = 'none'
  Object.assign(holder.element.style, props.iframeStyle)

  if (!holder.element.src)
    holder.element.src = props.entry.url

  const entryState = props.context.docks.getStateById(props.entry.id)
  if (entryState)
    entryState.domElements.iframe = holder.element

  holder.mount(viewFrame.value!)
  isLoading.value = false
  nextTick(() => {
    holder.update()
  })

  watch(
    () => props.context.panel,
    () => {
      holder.update()
    },
    { deep: true },
  )

  watchEffect(
    () => {
      holder.element.style.pointerEvents = (props.context.panel.isDragging || props.context.panel.isResizing) ? 'none' : 'auto'
    },
    { flush: 'sync' },
  )
})

onUnmounted(() => {
  const holder = props.persistedDoms.getHolder(props.entry.id, 'iframe')
  holder?.unmount()
})
</script>

<template>
  <div class="vite-devtools-view-iframe-container w-full h-full flex flex-col">
    <!-- Address Bar -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="showAddressBar"
        class="flex-none flex items-center gap-2 px-2 py-1.5 bg-[#1a1a1a] border-b border-[#333]"
      >
        <button
          class="p-1 rounded hover:bg-[#333] transition-colors"
          title="Refresh"
          @click="refreshIframe"
        >
          <div class="i-ph:arrow-clockwise w-4 h-4 op70" />
        </button>
        <div class="flex-1 flex items-center gap-2 px-2 py-1 rounded bg-[#252525] text-sm text-[#888] of-hidden">
          <div class="i-ph:globe w-3.5 h-3.5 flex-none op50" />
          <span class="truncate select-all">{{ currentUrl }}</span>
        </div>
        <button
          class="p-1 rounded hover:bg-[#333] transition-colors"
          title="Open in new tab"
          @click="openInNewTab"
        >
          <div class="i-ph:arrow-square-out w-4 h-4 op70" />
        </button>
      </div>
    </Transition>

    <!-- Iframe container -->
    <div
      ref="viewFrame"
      class="vite-devtools-view-iframe flex-1 w-full flex items-center justify-center"
    >
      <div v-if="isLoading" class="op50 z--1">
        Loading iframe...
      </div>
    </div>
  </div>
</template>
