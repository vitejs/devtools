<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import Dock from './Dock.vue'
import DockPanel from './DockPanel.vue'
import FloatingTooltip from './FloatingTooltip'

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
