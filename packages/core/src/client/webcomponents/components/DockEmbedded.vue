<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { onUnmounted } from 'vue'
import { closeDockPopup, useIsDockPopupOpen } from '../state/popup'
import Dock from './Dock.vue'
import DockPanel from './DockPanel.vue'
import FloatingElements from './FloatingElements.vue'
import ToastOverlay from './ToastOverlay.vue'

defineProps<{
  context: DocksContext
}>()

const isDockPopupOpen = useIsDockPopupOpen()

onUnmounted(() => {
  closeDockPopup()
})
</script>

<template>
  <Dock v-if="!isDockPopupOpen" :context>
    <template #default="{ dockEl, panelMargins, selected }">
      <DockPanel
        :context
        :selected
        :dock-el="dockEl!"
        :panel-margins="panelMargins"
      />
    </template>
  </Dock>
  <FloatingElements v-if="!isDockPopupOpen" />
  <ToastOverlay />
</template>
