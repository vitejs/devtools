<script setup lang="ts">
import type { DevToolsDockEntry, DevToolsViewGroup } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { useElementBounding, watchDebounced } from '@vueuse/core'
import { computed, h, ref, useTemplateRef } from 'vue'
import { deriveSidebarCapacity, docksSplitGroupsWithCapacity, getGroupMembersGrouped } from '../../state/dock-settings'
import { sharedStateToRef } from '../../state/docks'
import { setDocksSidebarOverflowPanel, setFloatingTooltip, useDocksSidebarOverflowPanel } from '../../state/floating-tooltip'
import DockGroupPopover from './DockGroupPopover.vue'
import DockIcon from './DockIcon.vue'

const props = defineProps<{
  context: DocksContext
  group: DevToolsViewGroup
  selectedId: string | null
}>()

// Vertical rhythm of the rail, in px. Mirrors the Uno classes on the template:
// each button is `w-8 h-8` (32) and children sit in a `gap-0.5` (2) flex column;
// the root has `py1.5` (6+6) padding; dividers are `h-px my0.5` (1 + 2*2).
const ITEM_HEIGHT = 34 // 32 button + 2 gap
const MORE_BUTTON_HEIGHT = 34 // matches a member button + gap
const DIVIDER_HEIGHT = 7 // 5 divider + 2 gap
// Root padding (12) + anchor (32) + gap (2) + anchor divider (5) + gap (2).
const RESERVED_HEIGHT = 53

const settings = sharedStateToRef(props.context.docks.settings)

// Members split by in-group sub-category so the sidebar can divide sections.
const memberGroups = computed(() => getGroupMembersGrouped(
  props.context.docks.entries,
  props.group.id,
  settings.value,
  { whenContext: props.context.when.context },
))

const sidebar = useTemplateRef<HTMLDivElement>('sidebar')
const { height: frameHeight } = useElementBounding(sidebar)

const totalItems = computed(() => memberGroups.value.reduce((acc, [, items]) => acc + items.length, 0))

// How many members the current frame height can hold before folding the rest
// into the show-more popover.
const capacity = computed(() => deriveSidebarCapacity({
  availableHeight: frameHeight.value,
  reservedHeight: RESERVED_HEIGHT,
  itemHeight: ITEM_HEIGHT,
  dividerHeight: DIVIDER_HEIGHT,
  moreButtonHeight: MORE_BUTTON_HEIGHT,
  dividerCount: Math.max(0, memberGroups.value.filter(([, items]) => items.length).length - 1),
  totalItems: totalItems.value,
}))

const split = computed(() => docksSplitGroupsWithCapacity(memberGroups.value, capacity.value))
const visibleGroups = computed(() => split.value.visible)
const overflowGroups = computed(() => split.value.overflow)

const overflowCount = computed(() => overflowGroups.value.reduce((acc, [, items]) => acc + items.length, 0))
const hasOverflow = computed(() => overflowCount.value > 0)
const overflowBadge = computed(() => (overflowCount.value > 9 ? '9+' : overflowCount.value.toString()))

// The current selection is hidden inside the show-more popover.
const selectedInOverflow = computed(() =>
  !!props.selectedId && overflowGroups.value.some(([, items]) => items.some(m => m.id === props.selectedId)))

function select(id: string) {
  props.context.docks.switchEntry(id)
}

function showTooltip(event: PointerEvent, title: string) {
  setFloatingTooltip({ content: title, el: event.currentTarget as HTMLElement })
}

function hideTooltip() {
  setFloatingTooltip(null)
}

// --- Show more (overflow) flyout ---
const moreButton = useTemplateRef<HTMLButtonElement>('moreButton')
const isOverflowPanelVisible = ref(false)
const overflowPanel = useDocksSidebarOverflowPanel()

function showOverflowPanel() {
  if (!moreButton.value)
    return
  isOverflowPanelVisible.value = true
  setDocksSidebarOverflowPanel({
    el: moreButton.value,
    placement: 'right',
    content: () => h(DockGroupPopover, {
      context: props.context,
      group: props.group,
      // Only the members that didn't fit on the rail.
      members: overflowGroups.value,
      selectedId: props.selectedId,
      onSelect: (entry: DevToolsDockEntry) => {
        select(entry.id)
        hideOverflowPanel()
      },
    }),
  })
}

function hideOverflowPanel() {
  isOverflowPanelVisible.value = false
  setDocksSidebarOverflowPanel(null)
}

function toggleOverflowPanel() {
  if (isOverflowPanelVisible.value)
    hideOverflowPanel()
  else
    showOverflowPanel()
}

// Sync internal visibility from the store on a delay so it doesn't race the
// "click outside" dismissal (same pattern as DockOverflowButton).
watchDebounced(
  () => overflowPanel.value,
  (value) => {
    isOverflowPanelVisible.value = value?.el === moreButton.value
  },
  { debounce: 1000 },
)

// Highlight the button when the hidden selection lives here, or while open.
const moreButtonActive = computed(() => selectedInOverflow.value || isOverflowPanelVisible.value)
</script>

<template>
  <div ref="sidebar" class="vite-devtools-group-sidebar flex flex-col flex-none w-12 h-full border-r border-base of-y-hidden of-x-hidden select-none py1.5 items-center gap-0.5">
    <!-- Group anchor -->
    <div
      class="flex items-center justify-center w-8 h-8 op60"
      @pointerenter="showTooltip($event, group.title)"
      @pointerleave="hideTooltip"
    >
      <DockIcon :icon="group.icon" class="w-5 h-5 flex-none" />
    </div>
    <div class="w-8 h-px border-t border-base my0.5" />

    <!-- Member icons, grouped by in-group sub-category -->
    <template v-for="([category, members], idx) of visibleGroups" :key="category">
      <!-- Sub-category divider, mirroring the group anchor separator -->
      <div v-if="idx > 0 && members.length" class="w-8 h-px border-t border-base my0.5" />
      <button
        v-for="member of members"
        :key="member.id"
        class="relative flex items-center justify-center w-8 h-8 rounded-lg transition"
        :class="selectedId === member.id ? 'text-primary bg-active' : 'op60 hover:op100 hover:bg-active'"
        @pointerenter="showTooltip($event, member.title)"
        @pointerleave="hideTooltip"
        @pointerdown="hideTooltip"
        @click="select(member.id)"
      >
        <DockIcon :icon="member.icon" class="w-5 h-5 flex-none" />
        <div
          v-if="member.badge"
          class="absolute top-0.5 right-0.5 bg-gray-6 text-white text-0.6em px-0.5 rounded-full shadow leading-none"
        >
          {{ member.badge }}
        </div>
      </button>
    </template>

    <!-- Show more: members that don't fit the current frame height -->
    <button
      v-if="hasOverflow"
      ref="moreButton"
      class="relative flex items-center justify-center w-8 h-8 rounded-lg transition mt-auto flex-none"
      :class="moreButtonActive ? 'text-primary bg-active' : 'op60 hover:op100 hover:bg-active'"
      @pointerenter="showTooltip($event, 'Show more')"
      @pointerleave="hideTooltip"
      @pointerdown="hideTooltip"
      @click="toggleOverflowPanel"
    >
      <DockIcon icon="ph:dots-three-circle-duotone" class="w-5 h-5 flex-none" />
      <div class="absolute top-0.5 right-0.5 bg-gray-6 text-white text-0.6em px-0.5 rounded-full shadow leading-none">
        {{ overflowBadge }}
      </div>
    </button>
  </div>
</template>
