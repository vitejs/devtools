<script setup lang="ts">
import type { DevToolsViewIframe } from '@vitejs/devtools-kit'
import type { CSSProperties } from 'vue'
import type { DevToolsDockState } from '../types/DockProps'
import type { PresistedDomViewsManager } from '../utils/PresistedDomViewsManager'
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch, watchEffect } from 'vue'

const props = defineProps<{
  state?: DevToolsDockState
  isDragging: boolean
  isResizing: boolean
  entry: DevToolsViewIframe
  presistedDoms: PresistedDomViewsManager
  iframeStyle?: CSSProperties
}>()

const isLoading = ref(true)
const viewFrame = useTemplateRef<HTMLDivElement>('viewFrame')

onMounted(() => {
  const holder = props.presistedDoms.getOrCreateHolder(props.entry.id, 'iframe')
  holder.element.style.boxShadow = 'none'
  holder.element.style.outline = 'none'
  Object.assign(holder.element.style, props.iframeStyle)

  if (!holder.element.src)
    holder.element.src = props.entry.url

  holder.mount(viewFrame.value!)
  isLoading.value = false
  nextTick(() => {
    holder.update()
  })

  watch(
    () => props.state,
    () => {
      holder.update()
    },
    { deep: true },
  )

  watchEffect(
    () => {
      holder.element.style.pointerEvents = (props.isDragging || props.isResizing) ? 'none' : 'auto'
    },
    { flush: 'sync' },
  )
})

onUnmounted(() => {
  const holder = props.presistedDoms.getHolder(props.entry.id, 'iframe')
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
