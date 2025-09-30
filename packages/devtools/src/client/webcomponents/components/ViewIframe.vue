<script setup lang="ts">
import type { DevToolsViewIframe } from '@vitejs/devtools-kit'
import type { DevToolsDockState } from './DockProps'
import type { IframeManager } from './IframeManager'
import { nextTick, onMounted, onUnmounted, useTemplateRef, watch, watchEffect } from 'vue'

const props = defineProps<{
  state?: DevToolsDockState
  isDragging: boolean
  isResizing: boolean
  entry: DevToolsViewIframe
  iframes: IframeManager
}>()

const viewFrame = useTemplateRef<HTMLDivElement>('viewFrame')

onMounted(() => {
  const holder = props.iframes.getIframeHolder(props.entry.id)
  holder.iframe.style.border = 'none'
  holder.iframe.style.borderRadius = '0.5rem'
  holder.iframe.style.boxShadow = 'none'
  holder.iframe.style.outline = 'none'
  holder.iframe.style.zIndex = '2147483645'

  if (!holder.iframe.src)
    holder.iframe.src = props.entry.url

  holder.mount(viewFrame.value!)
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
      holder.iframe.style.pointerEvents = (props.isDragging || props.isResizing) ? 'none' : 'auto'
    },
  )
})

onUnmounted(() => {
  const iframe = props.iframes.getIframeHolder(props.entry.id)
  iframe.unmount()
})
</script>

<template>
  <div
    ref="viewFrame"
    class="vite-devtools-view-iframe w-full h-full flex items-center justify-center"
  >
    <div class="op50">
      Loading iframe...
    </div>
  </div>
</template>
