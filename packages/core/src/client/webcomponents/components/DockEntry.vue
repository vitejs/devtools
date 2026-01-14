<script setup lang="ts">
import type { DevToolsDockEntryBase } from '@vitejs/devtools-kit'
import { useEventListener } from '@vueuse/core'
import { useTemplateRef } from 'vue'
import { setFloatingTooltip } from '../state/floating-tooltip'
import DockIcon from './DockIcon.vue'

const props = defineProps<{
  dock: DevToolsDockEntryBase
  isSelected?: boolean
  isDimmed?: boolean
  isVertical?: boolean
  badge?: string
}>()

const button = useTemplateRef<HTMLButtonElement>('button')

function updatePos() {
  const rect = button.value?.getBoundingClientRect()
  if (rect) {
    setFloatingTooltip({
      render: props.dock.title,
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
    })
  }
}

function showTitle() {
  updatePos()
}

function clearTitle() {
  setFloatingTooltip(null)
}

useEventListener('pointerdown', () => {
  setFloatingTooltip(null)
})
</script>

<template>
  <div
    :key="dock.id"
    class="relative group vite-devtools-dock-entry"
    @pointerenter="showTitle"
    @pointerleave="clearTitle"
  >
    <button
      ref="button"
      :title="dock.title"
      :class="[
        isVertical ? 'rotate-270' : '',
        isDimmed ? 'op50 saturate-0' : '',
        isSelected ? 'scale-120 text-purple' : '',
      ]"
      class="flex items-center justify-center p1.5 rounded-xl hover:bg-[#8881] hover:scale-110 transition-all duration-300 relative"
    >
      <DockIcon :icon="dock.icon" :title="dock.title" class="w-5 h-5 select-none" />
      <div v-if="badge" class="absolute top-0.5 right-0 bg-gray-6 text-white text-0.6em px-1 rounded-full shadow">
        {{ badge }}
      </div>
    </button>
  </div>
</template>
