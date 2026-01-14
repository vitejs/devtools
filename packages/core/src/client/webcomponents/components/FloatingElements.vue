<script setup lang="ts">
import { useFloatingTooltip } from '../state/floating-tooltip'
import FloatingPopover from './FloatingPopover'

const tooltip = useFloatingTooltip()
</script>

<template>
  <FloatingPopover :item="tooltip" />
</template>
