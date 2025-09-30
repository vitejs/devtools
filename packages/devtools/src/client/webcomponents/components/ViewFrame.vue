<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsDockState } from './DockProps'
import type { IframeManager } from './IframeManager'
import { nextTick, onMounted, onUnmounted, useTemplateRef, watch, watchEffect } from 'vue'

const props = defineProps<{
  state?: DevToolsDockState
  isDragging: boolean
  isResizing: boolean
  entry: DevToolsDockEntry
  iframes: IframeManager
}>()

const viewFrame = useTemplateRef<HTMLDivElement>('viewFrame')

onMounted(() => {
  if (props.entry.type === 'iframe') {
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
      holder.show()
    })

    watch(
      () => props.state,
      () => {
        nextTick(() => {
          if (props.state.dockEntry?.id === props.entry.id)
            holder.show()
          else
            holder.hide()
        })
      },
      { deep: true },
    )

    watchEffect(
      () => {
        holder.iframe.style.pointerEvents = (props.isDragging || props.isResizing) ? 'none' : 'auto'
      },
    )
  }
})

onUnmounted(() => {
  if (props.entry.type === 'iframe') {
    const iframe = props.iframes.getIframeHolder(props.entry.id)
    iframe.unmount()
  }
})
</script>

<template>
  <div
    id="vite-devtools-view-frame"
    ref="viewFrame"
    class="w-full h-full"
  >
    <!-- {{ entry }} -->
  </div>
</template>
