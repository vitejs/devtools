<script setup lang="ts">
import type { DevToolsViewCustomRender } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { CSSProperties } from 'vue'
import type { PresistedDomViewsManager } from '../utils/PresistedDomViewsManager'
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch, watchEffect } from 'vue'

const props = defineProps<{
  context: DocksContext
  entry: DevToolsViewCustomRender
  presistedDoms: PresistedDomViewsManager
  divStyle?: CSSProperties
}>()

const isLoading = ref(true)
const viewFrame = useTemplateRef<HTMLDivElement>('viewFrame')

onMounted(() => {
  const holder = props.presistedDoms.getOrCreateHolder(props.entry.id, 'div')
  holder.element.style.boxShadow = 'none'
  holder.element.style.outline = 'none'
  Object.assign(holder.element.style, props.divStyle)

  const entryState = props.context.docks.getStateById(props.entry.id)
  if (entryState)
    entryState.domElements.panel = holder.element

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
  const holder = props.presistedDoms.getHolder(props.entry.id, 'div')
  holder?.unmount()
})
</script>

<template>
  <div
    ref="viewFrame"
    class="vite-devtools-view-custom-renderer w-full h-full flex items-center justify-center"
  />
</template>
