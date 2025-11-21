<script setup lang="ts">
import type { DevToolsViewIframe } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { CSSProperties } from 'vue'
import type { PersistedDomViewsManager } from '../utils/PersistedDomViewsManager'
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch, watchEffect } from 'vue'

const props = defineProps<{
  context: DocksContext
  entry: DevToolsViewIframe
  persistedDoms: PersistedDomViewsManager
  iframeStyle?: CSSProperties
}>()

const isLoading = ref(true)
const viewFrame = useTemplateRef<HTMLDivElement>('viewFrame')

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
  <div
    ref="viewFrame"
    class="vite-devtools-view-iframe w-full h-full flex items-center justify-center"
  >
    <div v-if="isLoading" class="op50 z--1">
      Loading iframe...
    </div>
  </div>
</template>
