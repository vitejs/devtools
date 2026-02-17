<script setup lang="ts">
import type { DevToolsDockEntryBase } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { useEventListener } from '@vueuse/core'
import { useTemplateRef } from 'vue'
import { setFloatingTooltip } from '../state/floating-tooltip'
import { openDockContextMenu } from './DockContextMenu'
import DockIcon from './DockIcon.vue'

const props = withDefaults(
  defineProps<{
    context: DocksContext
    dock: DevToolsDockEntryBase
    isSelected?: boolean
    isDimmed?: boolean
    isVertical?: boolean
    badge?: string
    tooltip?: boolean
  }>(),
  {
    tooltip: true,
  },
)

const button = useTemplateRef<HTMLButtonElement>('button')

function updateTooltip() {
  if (!props.tooltip)
    return
  if (!button.value)
    return
  setFloatingTooltip({
    content: props.dock.title,
    el: button.value,
  })
}

function clearTitle() {
  if (!props.tooltip)
    return
  setFloatingTooltip(null)
}

function openContextMenu(e: MouseEvent) {
  if (!button.value)
    return
  if (props.dock.id === 'overflow')
    return
  e.preventDefault()
  clearTitle()
  const entry = props.context.docks.entries.find(item => item.id === props.dock.id)
  if (!entry)
    return
  openDockContextMenu({
    context: props.context,
    entry,
    el: button.value,
    gap: 6,
  })
}

useEventListener('pointerdown', () => {
  if (!props.tooltip)
    return
  setFloatingTooltip(null)
})
</script>

<template>
  <div
    :key="dock.id"
    class="relative group vite-devtools-dock-entry"
    @pointerenter="updateTooltip"
    @pointerleave="clearTitle"
    @contextmenu="openContextMenu"
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
