<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DevToolsRpcClient } from '@vitejs/devtools-kit/client'
import type { DevToolsDockState } from '../types/DockProps'
import Dock from './Dock.vue'
import DockPanel from './DockPanel.vue'
import FloatingTooltip from './FloatingTooltip.vue'

defineProps<{
  state: DevToolsDockState
  docks: DevToolsDockEntry[]
  rpc: DevToolsRpcClient
}>()
</script>

<template>
  <Dock
    :state="state"
    :docks="docks"
    :rpc="rpc"
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
