<script setup lang="ts">
import type { DocksContext } from '../state/dock'
import Dock from './Dock.vue'
import DockPanel from './DockPanel.vue'
import FloatingTooltip from './FloatingTooltip.vue'

defineProps<{
  context: DocksContext
}>()
</script>

<template>
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
  <FloatingTooltip />
</template>
