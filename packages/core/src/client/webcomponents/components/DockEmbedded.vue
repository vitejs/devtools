<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { useEventListener } from '@vueuse/core'
import { onUnmounted } from 'vue'
import { sharedStateToRef } from '../state/docks'
import { closeDockPopup, useIsDockPopupOpen } from '../state/popup'
import Dock from './Dock.vue'
import DockEdge from './DockEdge.vue'
import DockPanel from './DockPanel.vue'
import FloatingElements from './FloatingElements.vue'
import ToastOverlay from './ToastOverlay.vue'

const props = defineProps<{
  context: DocksContext
}>()

const isDockPopupOpen = useIsDockPopupOpen()
const settings = sharedStateToRef(props.context.docks.settings)

// Close the dock when clicking outside of it
useEventListener(window, 'mousedown', (e: MouseEvent) => {
  if (!settings.value.closeOnOutsideClick)
    return
  if (isDockPopupOpen.value)
    return
  if (!props.context.panel.store.open || props.context.panel.isDragging || props.context.panel.isResizing)
    return

  const matched = e.composedPath().find((_el) => {
    const el = _el as HTMLElement
    return [...(el.classList || [])].some(c => c.startsWith('vite-devtools-'))
      || el.id?.startsWith('vite-devtools-')
      || el.tagName?.toLowerCase() === 'iframe'
  })

  if (!matched)
    props.context.docks.switchEntry(null)
})

onUnmounted(() => {
  closeDockPopup()
})
</script>

<template>
  <template v-if="!isDockPopupOpen">
    <template v-if="context.panel.store.mode === 'edge'">
      <DockEdge :context />
    </template>
    <template v-else>
      <Dock :context>
        <template #default="{ dockEl, panelMargins, selected }">
          <DockPanel
            :context
            :selected
            :dock-el="dockEl!"
            :panel-margins="panelMargins"
          />
        </template>
      </Dock>
    </template>
    <FloatingElements />
  </template>
  <ToastOverlay :context />
</template>
