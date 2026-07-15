<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { CSSProperties } from 'vue'
import { computed, h, useTemplateRef } from 'vue'
import { getEntryGroup } from '../../state/dock-settings'
import { setEdgePositionDropdown, setFloatingTooltip, useEdgePositionDropdown } from '../../state/floating-tooltip'
import { useIframePanes } from '../../utils/useIframePanes'
import ViewEntry from '../views/ViewEntry.vue'
import DockEntriesWithCategories from './DockEntriesWithCategories.vue'
import DockGroupSidebar from './DockGroupSidebar.vue'
import DockPanelResizer from './DockPanelResizer.vue'

const props = defineProps<{
  context: DocksContext
}>()

const context = props.context
const store = context.panel.store

const viewsContainer = useTemplateRef<HTMLElement>('viewsContainer')
const panes = useIframePanes(viewsContainer, context.panel)

const isVertical = computed(() => store.position === 'left' || store.position === 'right')

const groupedEntries = computed(() => context.docks.groupedEntries)
const selectedEntry = computed(() => context.docks.selected)
const activeGroup = computed(() => getEntryGroup(context.docks.entries, selectedEntry.value))
const hasPanelContent = computed(() => {
  const entry = selectedEntry.value
  return context.panel.store.open
    && !!entry
    && entry.type !== 'action'
})

const positions = ['top', 'right', 'bottom', 'left'] as const
const positionIcons: Record<string, string> = {
  top: 'i-ph-square-half-bottom-duotone rotate-180',
  right: 'i-ph-square-half-bottom-duotone rotate-270',
  bottom: 'i-ph-square-half-bottom-duotone',
  left: 'i-ph-square-half-bottom-duotone rotate-90',
}
const positionLabels: Record<string, string> = {
  top: 'Top',
  right: 'Right',
  bottom: 'Bottom',
  left: 'Left',
}
const positionDropdownPlacement: Record<string, 'top' | 'bottom' | 'left' | 'right'> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

function switchPosition(pos: 'top' | 'right' | 'bottom' | 'left') {
  store.position = pos
  setEdgePositionDropdown(null)
}

const positionButton = useTemplateRef<HTMLButtonElement>('positionButton')
const floatButton = useTemplateRef<HTMLButtonElement>('floatButton')
const edgePositionDropdown = useEdgePositionDropdown()

function showTooltip(el: HTMLElement | null, text: string) {
  if (!el)
    return
  setFloatingTooltip({ content: text, el })
}
function hideTooltip() {
  setFloatingTooltip(null)
}

function togglePositionDropdown() {
  if (!positionButton.value)
    return
  if (edgePositionDropdown.value) {
    setEdgePositionDropdown(null)
    return
  }
  setEdgePositionDropdown({
    el: positionButton.value,
    gap: 6,
    placement: positionDropdownPlacement[store.position],
    content: () => h('div', { class: 'flex flex-col gap-0.5 min-w-28' }, positions.map(pos =>
      h('button', {
        class: [
          'flex items-center gap-2 w-full px2 py1 rounded hover:bg-active transition text-sm',
          store.position === pos ? 'text-primary bg-active' : 'op75 hover:op100',
        ],
        onClick: () => switchPosition(pos),
      }, [
        h('div', { class: `${positionIcons[pos]} w-4.5 h-4.5` }),
        h('span', positionLabels[pos]),
      ]),
    )),
  })
}

function switchToFloat() {
  // Set sensible defaults for float position based on current edge position
  switch (store.position) {
    case 'bottom':
      store.left = 50
      store.top = 100
      break
    case 'top':
      store.left = 50
      store.top = 0
      break
    case 'left':
      store.left = 0
      store.top = 50
      break
    case 'right':
      store.left = 100
      store.top = 50
      break
  }
  store.mode = 'float'
}

const panelStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    position: 'fixed',
    pointerEvents: context.panel.isResizing ? 'none' : 'auto',
  }

  switch (store.position) {
    case 'bottom':
      style.left = '0'
      style.right = '0'
      style.bottom = '0'
      style.borderRadius = '8px 8px 0 0'
      if (hasPanelContent.value) {
        style.height = `${store.height}vh`
        style.minHeight = '150px'
      }
      break
    case 'top':
      style.left = '0'
      style.right = '0'
      style.top = '0'
      style.borderRadius = '0 0 8px 8px'
      if (hasPanelContent.value) {
        style.height = `${store.height}vh`
        style.minHeight = '150px'
      }
      break
    case 'left':
      style.top = '0'
      style.bottom = '0'
      style.left = '0'
      style.borderRadius = '0 8px 8px 0'
      if (hasPanelContent.value) {
        style.width = `${store.width}vw`
        style.minWidth = '200px'
      }
      break
    case 'right':
      style.top = '0'
      style.bottom = '0'
      style.right = '0'
      style.borderRadius = '8px 0 0 8px'
      if (hasPanelContent.value) {
        style.width = `${store.width}vw`
        style.minWidth = '200px'
      }
      break
  }

  return style
})

const panelLayoutClass = computed(() => {
  switch (store.position) {
    case 'bottom':
      return 'flex flex-col-reverse'
    case 'top':
      return 'flex flex-col'
    case 'left':
      return 'flex flex-row'
    case 'right':
      return 'flex flex-row-reverse'
    default:
      return 'flex flex-col-reverse'
  }
})

const toolbarClass = computed(() => {
  switch (store.position) {
    case 'bottom':
      return 'flex-row w-full border-t border-base'
    case 'top':
      return 'flex-row w-full border-b border-base'
    case 'left':
      return 'flex-col h-full w-[40px] border-r border-base'
    case 'right':
      return 'flex-col h-full w-[40px] border-l border-base'
    default:
      return 'flex-row w-full border-t border-base'
  }
})

const contentClass = computed(() => {
  return isVertical.value
    ? 'flex-1 h-full overflow-hidden'
    : 'flex-1 w-full overflow-hidden'
})
</script>

<template>
  <div
    id="vite-devtools-edge-panel"
    class="bg-glass:75 border border-base color-base shadow overflow-hidden z-floating-anchor font-sans text-[15px] box-border"
    :class="panelLayoutClass"
    :style="panelStyle"
  >
    <DockPanelResizer v-if="hasPanelContent" :panel="context.panel" edge-mode />

    <!-- Toolbar -->
    <div class="flex items-center shrink-0 select-none py1" :class="toolbarClass">
      <div
        class="flex items-center flex-1 flex-wrap gap-0.5 px1"
        :class="isVertical ? 'flex-col py1' : 'flex-row px1'"
      >
        <DockEntriesWithCategories
          :context="context"
          :groups="groupedEntries"
          :is-vertical="isVertical"
          :rotate="false"
          :selected="selectedEntry"
          @select="(e) => context.docks.switchEntry(e?.id)"
        />
      </div>

      <!-- Position dropdown & float toggle -->
      <div
        class="flex items-center gap-0.5 shrink-0 px1"
        :class="isVertical ? 'flex-col py1 border-t border-base' : 'flex-row px1 border-l border-base'"
      >
        <button
          ref="positionButton"
          class="p1.5 rounded hover:bg-active transition op75 hover:op100"
          @pointerenter="showTooltip(positionButton, 'Edge position')"
          @pointerleave="hideTooltip"
          @pointerdown="hideTooltip"
          @click="togglePositionDropdown"
        >
          <div :class="positionIcons[store.position]" class="w-4.5 h-4.5" />
        </button>
        <button
          ref="floatButton"
          class="p1.5 rounded hover:bg-active transition op50 hover:op100"
          @pointerenter="showTooltip(floatButton, 'Float mode')"
          @pointerleave="hideTooltip"
          @pointerdown="hideTooltip"
          @click="switchToFloat"
        >
          <div class="i-ph-cards-three-duotone w-4.5 h-4.5" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-show="hasPanelContent" class="flex" :class="contentClass">
      <DockGroupSidebar
        v-if="activeGroup"
        :context
        :group="activeGroup"
        :selected-id="selectedEntry?.id ?? null"
      />
      <div class="relative flex-1 min-w-0 h-full">
        <slot name="view" :entry="selectedEntry">
          <ViewEntry
            v-if="hasPanelContent && panes && selectedEntry"
            :key="selectedEntry.id"
            :context
            :entry="selectedEntry"
            :panes="panes"
          />
          <div
            id="vite-devtools-views-container"
            ref="viewsContainer"
            class="absolute inset-0 pointer-events-none"
          />
        </slot>
      </div>
    </div>
  </div>
</template>
