<script setup lang="ts">
import type { FloatingTooltip } from '../state/floating-tooltip'
import { computed, ref, watchEffect } from 'vue'
import { useFloatingTooltip } from '../state/floating-tooltip'

const DETECT_MARGIN = 100
const GAP = 10

const current = useFloatingTooltip()
const box = ref<FloatingTooltip>({
  text: '',
  width: 0,
  height: 0,
  left: 0,
  top: 0,
})

// guess alignment of the tooltip based on viewport position
const align = computed<'bottom' | 'left' | 'right' | 'top'>(() => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (box.value.left < DETECT_MARGIN)
    return 'right'
  if (box.value.left + box.value.width > vw - DETECT_MARGIN)
    return 'left'
  if (box.value.top < DETECT_MARGIN)
    return 'bottom'
  if (box.value.top + box.value.height > vh - DETECT_MARGIN)
    return 'top'
  return 'bottom'
})

const style = computed(() => {
  switch (align.value) {
    case 'bottom': {
      return {
        left: `${box.value.left + box.value.width / 2}px`,
        top: `${box.value.top + box.value.height + GAP}px`,
        transform: 'translateX(-50%)',
      }
    }
    case 'top': {
      return {
        left: `${box.value.left + box.value.width / 2}px`,
        bottom: `${window.innerHeight - box.value.top + GAP}px`,
        transform: 'translateX(-50%)',
      }
    }
    case 'left': {
      return {
        right: `${window.innerWidth - box.value.left + GAP}px`,
        top: `${box.value.top + box.value.height / 2}px`,
        transform: 'translateY(-50%)',
      }
    }
    case 'right': {
      return {
        left: `${box.value.left + box.value.width + GAP}px`,
        top: `${box.value.top + box.value.height / 2}px`,
        transform: 'translateY(-50%)',
      }
    }
    default: {
      throw new Error('Unreachable')
    }
  }
})

watchEffect(() => {
  if (current.value) {
    box.value = { ...current.value }
  }
})
</script>

<template>
  <div
    v-if="box.text"
    class="z-floating-tooltip text-xs transition-all duration-300 w-max bg-glass border border-base rounded px2 fixed p1"
    :class="current ? 'op100' : 'op0 pointer-events-none'"
    :style="style"
  >
    {{ box.text }}
  </div>
</template>
