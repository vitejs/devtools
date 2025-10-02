<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { DevToolsViewIframe } from '../../../../../kit/src'
import type { DevToolsDockState } from './DockProps'
import type { IframeManager } from './IframeManager'
import { nextTick, onMounted, onUnmounted, useTemplateRef, watch, watchEffect } from 'vue'

const props = defineProps<{
  state?: DevToolsDockState
  isDragging: boolean
  isResizing: boolean
  entry: DevToolsViewIframe
  iframes: IframeManager
  iframeStyle?: CSSProperties
}>()

const viewFrame = useTemplateRef<HTMLDivElement>('viewFrame')

onMounted(() => {
  const holder = props.iframes.getIframeHolder(props.entry.id)
  holder.iframe.style.boxShadow = 'none'
  holder.iframe.style.outline = 'none'
  Object.assign(holder.iframe.style, props.iframeStyle)

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
    { flush: 'sync' },
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
