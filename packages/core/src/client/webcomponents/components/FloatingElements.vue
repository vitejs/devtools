<script setup lang="ts">
import { setDocksOverflowPanel, useDocksOverflowPanel, useFloatingTooltip } from '../state/floating-tooltip'
import FloatingPopover from './FloatingPopover'

const tooltip = useFloatingTooltip()
const docksOverflowPanel = useDocksOverflowPanel()
</script>

<template>
  <FloatingPopover :item="docksOverflowPanel" @dismiss="() => setDocksOverflowPanel(null)" />
  <FloatingPopover :item="tooltip" />
</template>
