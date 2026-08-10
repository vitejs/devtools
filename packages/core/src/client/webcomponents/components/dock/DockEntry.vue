<script setup lang="ts">
import type { DevToolsDockBadgeVariant, DevToolsDockEntryBase } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { useEventListener } from '@vueuse/core'
import { computed, useTemplateRef } from 'vue'
import { colors } from '../../json-render/components/tokens'
import { setFloatingTooltip } from '../../state/floating-tooltip'
import { accentTextStyle } from '../../utils/accent-color'
import { openDockContextMenu } from './DockContextMenu'
import DockIcon from './DockIcon.vue'

const props = withDefaults(
  defineProps<{
    context: DocksContext
    dock: DevToolsDockEntryBase
    isAction?: boolean
    isSelected?: boolean
    isDimmed?: boolean
    isVertical?: boolean
    badge?: string
    badgeVariant?: DevToolsDockBadgeVariant
    tooltip?: boolean
    /** A `group` entry's optional `accentColor`, applied while selected/active. */
    accentColor?: string
  }>(),
  {
    tooltip: true,
  },
)

// Only kicks in while selected — an idle group button keeps its default look.
const accentStyle = computed(() => (props.isSelected ? accentTextStyle(props.accentColor) : undefined))

/** `undefined` at `'default'`/unset keeps the existing `bg-gray-6 text-white` classes below. `colors[variant].bg`'s alpha is tuned for a tab badge, so it's boosted here for better contrast on the dock bar. */
const badgeStyle = computed(() => {
  if (!props.badgeVariant || props.badgeVariant === 'default')
    return undefined
  const { bg, fg } = colors[props.badgeVariant]
  return { backgroundColor: `rgba(from ${bg} r g b / 0.35)`, color: fg }
})

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
      :aria-label="dock.title"
      :style="accentStyle"
      :class="[
        isVertical ? 'rotate-270' : '',
        isDimmed ? 'op50 saturate-0' : '',
        isSelected ? (accentColor ? 'scale-120' : 'scale-120 text-primary') : '',
        isAction ? 'bg-[#8881] hover:bg-[#8882] rounded-full' : 'rounded-xl',
      ]"
      class="flex items-center justify-center p1.5 hover:bg-[#8881] hover:scale-110 transition-all duration-300 relative outline-none"
    >
      <DockIcon :icon="dock.icon" class="w-5 h-5 select-none" />
      <div
        v-if="badge"
        class="absolute top-0.5 right-0 text-0.6em px-1 rounded-full shadow"
        :class="badgeStyle ? '' : 'bg-gray-6 text-white'"
        :style="badgeStyle"
      >
        {{ badge }}
      </div>
    </button>
  </div>
</template>
