<script setup lang="ts">
import type { DevToolsViewCustomRender } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { IframePanes } from 'iframe-pane'
import type { CSSProperties } from 'vue'
import { onMounted, onUnmounted, useTemplateRef } from 'vue'

const props = defineProps<{
  context: DocksContext
  entry: DevToolsViewCustomRender
  panes: IframePanes
  divStyle?: CSSProperties
}>()

const viewFrame = useTemplateRef<HTMLDivElement>('viewFrame')

onMounted(() => {
  const pane = props.panes.ensure(props.entry.id, { tagName: 'div' })
  const el = pane.element
  el.style.boxShadow = 'none'
  el.style.outline = 'none'
  Object.assign(el.style, props.divStyle)

  const entryState = props.context.docks.getStateById(props.entry.id)
  if (entryState)
    entryState.domElements.panel = el

  pane.mount(viewFrame.value!)
})

onUnmounted(() => {
  props.panes.get(props.entry.id)?.unmount()
})
</script>

<template>
  <div
    ref="viewFrame"
    class="vite-devtools-view-custom-renderer w-full h-full flex items-center justify-center"
  />
</template>
