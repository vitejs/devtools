<script setup lang="ts">
import type { DevToolsDockEntry } from '../../../../../kit/src'
import type { DevToolsDockState } from './DockProps'
import Dock from './Dock.vue'
import DockPanel from './DockPanel.vue'

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
    <template #default="{ dockEl, entry, panelMargins }">
      <DockPanel
        :dock-el="dockEl!"
        :state="state"
        :panel-margins="panelMargins"
        :entry="entry"
      />
    </template>
  </Dock>
</template>
