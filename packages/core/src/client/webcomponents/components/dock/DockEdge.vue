<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { CSSProperties } from 'vue'
import type { DevToolsDocksUserSettings } from '../../state/dock-settings'
import type { DockEdge as DockEdgePosition, DockLayout } from './dock-layout'
import { useEventListener } from '@vueuse/core'
import { computed, h, onMounted, ref, useTemplateRef } from 'vue'
import { getEntryGroup } from '../../state/dock-settings'
import { sharedStateToRef } from '../../state/docks'
import { setEdgePositionDropdown, setFloatingTooltip, useEdgePositionDropdown } from '../../state/floating-tooltip'
import { useIframePanes } from '../../utils/useIframePanes'
import VitePlusCore from '../icons/VitePlusCore.vue'
import ViewEntry from '../views/ViewEntry.vue'
import { resolveDockEdge, resolveDockLayout } from './dock-layout'
import DockEntriesWithCategories from './DockEntriesWithCategories.vue'
import DockGroupSidebar from './DockGroupSidebar.vue'
import DockPanelResizer from './DockPanelResizer.vue'

const props = defineProps<{
  context: DocksContext
  /** Override dock layout tunables — shared with the float-mode bar's `layout` prop. */
  layout?: Partial<DockLayout>
}>()

const context = props.context
const store = context.panel.store
const settings = sharedStateToRef<DevToolsDocksUserSettings>(context.docks.settings)
const layout = computed(() => resolveDockLayout(props.layout))

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

// Auto-collapse (opt-in via `settings.autoCollapseEdgeToolbar`): idle-timeout +
// hover tracking, mirroring Dock.vue's own float-bar minimize mechanism
// (`isHovering`/`bringUp`/`isMinimized`). Kept entirely local/ephemeral — it's
// not part of the hub-defined `DockPanelStorage`, same as Dock.vue's own
// `isHovering` isn't either.
const isHovering = ref(false)
let _idleTimer: ReturnType<typeof setTimeout> | null = null
function bringUp() {
  isHovering.value = true
  if (store.inactiveTimeout < 0)
    return
  if (_idleTimer)
    clearTimeout(_idleTimer)
  _idleTimer = setTimeout(() => {
    isHovering.value = false
  }, +store.inactiveTimeout || 0)
}

const isCollapsed = computed(() => {
  if (!settings.value.autoCollapseEdgeToolbar)
    return false
  if (store.inactiveTimeout < 0)
    return false
  if (context.panel.isDragging)
    return false
  if (hasPanelContent.value)
    return false
  if (store.inactiveTimeout === 0)
    return true
  // @ts-expect-error compatibility (mirrors Dock.vue's own touch-device check)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
  return !isHovering.value && !isTouchDevice
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

// Edge-position drag-to-snap: dragging the "Edge position" button snaps the
// whole panel among the four edges via `resolveDockEdge` (the same primitive
// Dock.vue's float-bar drag uses). Unlike Dock.vue, the commit is deferred to
// `pointerup` rather than live-updated on every `pointermove` — the edge panel
// can be full-viewport with open content, so live-reflowing it on every pointer
// move would jank the iframe underneath. A lightweight preview strip
// (`dragPreviewStyle`) tracks the candidate edge instead. Confined to snapping
// among the four edges only — never transitions `store.mode` to `'float'`.
const DRAG_THRESHOLD = 4
const positionDragStart = ref<{ x: number, y: number } | null>(null)
const hasDraggedPosition = ref(false)
const dragPreviewPosition = ref<DockEdgePosition | null>(null)

function onPositionPointerDown(e: PointerEvent) {
  hideTooltip()
  // Reset at the start of the *next* gesture, not in `pointerup` — the
  // synthetic `click` fires after `pointerup` and needs to still see this.
  hasDraggedPosition.value = false
  positionDragStart.value = { x: e.clientX, y: e.clientY }
}

function togglePositionDropdown() {
  // A drag just ended — the click that follows a real drag shouldn't also pop
  // the dropdown. `hasDraggedPosition` is deliberately left set here; it's
  // only cleared at the *next* pointerdown (see `onPositionPointerDown`),
  // since the browser dispatches this `click` after `pointerup`.
  if (hasDraggedPosition.value)
    return
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

onMounted(() => {
  bringUp()

  useEventListener(window, 'pointermove', (e: PointerEvent) => {
    if (!positionDragStart.value)
      return

    const dx = e.clientX - positionDragStart.value.x
    const dy = e.clientY - positionDragStart.value.y
    if (!hasDraggedPosition.value && Math.hypot(dx, dy) < DRAG_THRESHOLD)
      return

    if (!hasDraggedPosition.value) {
      hasDraggedPosition.value = true
      context.panel.isDragging = true
      setEdgePositionDropdown(null)
    }

    dragPreviewPosition.value = resolveDockEdge({
      x: e.clientX,
      y: e.clientY,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      layout: layout.value,
    })
  })
  useEventListener(window, 'pointerup', () => {
    if (!positionDragStart.value)
      return
    if (hasDraggedPosition.value && dragPreviewPosition.value)
      store.position = dragPreviewPosition.value
    positionDragStart.value = null
    dragPreviewPosition.value = null
    context.panel.isDragging = false
    bringUp()
  })
  useEventListener(window, 'pointerleave', () => {
    if (!positionDragStart.value)
      return
    // The pointer left the window mid-drag — cancel rather than commit.
    positionDragStart.value = null
    dragPreviewPosition.value = null
    context.panel.isDragging = false
  })
})

// Collapsed sizing shrinks the panel itself down to a small pill anchored at
// the corner nearest the "Edge position"/"Float mode" buttons — mirroring
// `Dock.vue`'s own minimize (a real size change, not just an opacity fade).
// Safe to transition (plain percentage/px `width`/`height`, no `calc-size()`
// needed) because `isCollapsed` already guards on `!hasPanelContent`: the
// panel never carries a `vh`/`vw`-stretched, content-bearing size while
// collapsing.
const COLLAPSED_SIZE = '28px'
const COLLAPSED_INSET = '8px'

const panelStyle = computed(() => {
  const style: any = {
    position: 'fixed',
    pointerEvents: (context.panel.isResizing || context.panel.isDragging) ? 'none' : 'auto',
  }

  switch (store.position) {
    case 'bottom':
      if (isCollapsed.value) {
        style.bottom = COLLAPSED_INSET
        style.right = COLLAPSED_INSET
        style.width = COLLAPSED_SIZE
        style.height = COLLAPSED_SIZE
        style.borderRadius = '999px'
      }
      else {
        style.bottom = '0'
        style.right = '0'
        style.width = '100%'
        style.borderRadius = '8px 8px 0 0'
        style.height = hasPanelContent.value ? `${store.height}vh` : 'var(--vite-devtools-dock-height, 40px)'
        if (hasPanelContent.value)
          style.minHeight = '150px'
      }
      break
    case 'top':
      if (isCollapsed.value) {
        style.top = COLLAPSED_INSET
        style.right = COLLAPSED_INSET
        style.width = COLLAPSED_SIZE
        style.height = COLLAPSED_SIZE
        style.borderRadius = '999px'
      }
      else {
        style.top = '0'
        style.right = '0'
        style.width = '100%'
        style.borderRadius = '0 0 8px 8px'
        style.height = hasPanelContent.value ? `${store.height}vh` : 'var(--vite-devtools-dock-height, 40px)'
        if (hasPanelContent.value)
          style.minHeight = '150px'
      }
      break
    case 'left':
      if (isCollapsed.value) {
        style.left = COLLAPSED_INSET
        style.bottom = COLLAPSED_INSET
        style.width = COLLAPSED_SIZE
        style.height = COLLAPSED_SIZE
        style.borderRadius = '999px'
      }
      else {
        style.left = '0'
        style.bottom = '0'
        style.height = '100%'
        style.borderRadius = '0 8px 8px 0'
        style.width = hasPanelContent.value ? `${store.width}vw` : 'var(--vite-devtools-dock-height, 40px)'
        if (hasPanelContent.value)
          style.minWidth = '200px'
      }
      break
    case 'right':
      if (isCollapsed.value) {
        style.right = COLLAPSED_INSET
        style.bottom = COLLAPSED_INSET
        style.width = COLLAPSED_SIZE
        style.height = COLLAPSED_SIZE
        style.borderRadius = '999px'
      }
      else {
        style.right = '0'
        style.bottom = '0'
        style.height = '100%'
        style.borderRadius = '8px 0 0 8px'
        style.width = hasPanelContent.value ? `${store.width}vw` : 'var(--vite-devtools-dock-height, 40px)'
        if (hasPanelContent.value)
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

/** A thin band flush with the candidate edge, tracking the drag before it commits on release. */
const dragPreviewStyle = computed<CSSProperties | undefined>(() => {
  const position = dragPreviewPosition.value
  if (!position)
    return undefined

  const style: CSSProperties = { position: 'fixed' }
  switch (position) {
    case 'bottom':
      style.left = '0'
      style.right = '0'
      style.bottom = '0'
      style.height = '4px'
      break
    case 'top':
      style.left = '0'
      style.right = '0'
      style.top = '0'
      style.height = '4px'
      break
    case 'left':
      style.top = '0'
      style.bottom = '0'
      style.left = '0'
      style.width = '4px'
      break
    case 'right':
      style.top = '0'
      style.bottom = '0'
      style.right = '0'
      style.width = '4px'
      break
  }
  return style
})
</script>

<template>
  <div
    id="vite-devtools-edge-panel"
    class="bg-glass:80 border border-base color-base shadow overflow-hidden z-floating-anchor font-sans text-[15px] box-border"
    :class="[panelLayoutClass, { 'vite-devtools-edge-collapsed': isCollapsed }]"
    :style="panelStyle"
    @mousemove="bringUp"
  >
    <DockPanelResizer v-if="hasPanelContent" :panel="context.panel" edge-mode />

    <!-- Toolbar -->
    <div class="relative flex items-center shrink-0 select-none py1" :class="toolbarClass">
      <div
        class="flex items-center flex-1 w-full transition-opacity duration-300"
        :class="[isVertical ? 'flex-col' : 'flex-row', isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100']"
      >
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
            aria-label="Edge position"
            class="p1.5 rounded hover:bg-active transition op75 hover:op100"
            @pointerenter="showTooltip(positionButton, 'Edge position')"
            @pointerleave="hideTooltip"
            @pointerdown="onPositionPointerDown"
            @click="togglePositionDropdown"
          >
            <div :class="positionIcons[store.position]" class="w-4.5 h-4.5" />
          </button>
          <button
            ref="floatButton"
            aria-label="Float mode"
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

    <!-- Collapsed-state icon: always mounted, opacity-toggled (mirrors
         Dock.vue:272-281's own minimized nub) — the panel itself has already
         shrunk to a small pill via `panelStyle`'s collapsed branch above, so
         this only needs to center inside whatever box that currently is. -->
    <div
      class="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
      :class="isCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <VitePlusCore class="w-4 h-4" :class="isVertical ? 'rotate-270' : 'rotate-0'" />
    </div>
  </div>

  <!-- Edge-position drag preview: a thin band flush with the candidate edge,
       rendered only while dragging; the real panel only moves on release. -->
  <div
    v-if="dragPreviewPosition"
    class="fixed pointer-events-none z-floating-anchor bg-primary/15"
    :style="dragPreviewStyle"
  />
</template>
