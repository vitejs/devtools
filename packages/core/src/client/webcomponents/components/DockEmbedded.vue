<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsDockState } from './DockProps'
import Dock from './Dock.vue'
import DockPanel from './DockPanel.vue'
import FloatingTooltip from './FloatingTooltip.vue'

defineProps<{
  state: DevToolsDockState
  docks: DevToolsDockEntry[]
}>()
</script>

<template>
  <Dock
    :state="state"
    :docks="docks"
  >
    <template #default="{ dockEl, entry, panelMargins, isDragging }">
      <DockPanel
        :dock-el="dockEl!"
        :state="state"
        :is-dragging="isDragging"
        :panel-margins="panelMargins"
        :entry="entry"
      />
    </template>
  </Dock>
  <FloatingTooltip />
</template>
