<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { CSSProperties } from 'vue'
import type { DockLayout } from './dock-layout'
import { useElementBounding, useWindowSize } from '@vueuse/core'
import { computed, onMounted, reactive, ref, toRefs, useTemplateRef } from 'vue'
import { getEntryGroup } from '../../state/dock-settings'
import { useIframePanes } from '../../utils/useIframePanes'
import ViewEntry from '../views/ViewEntry.vue'
import { DEFAULT_DOCK_LAYOUT, resolveDockAnchor } from './dock-layout'
import { openDockContextMenu } from './DockContextMenu'
import DockGroupSidebar from './DockGroupSidebar.vue'
import DockPanelResizer from './DockPanelResizer.vue'

const props = defineProps<{
  context: DocksContext
  selected: DevToolsDockEntry | null
  dockEl?: HTMLDivElement
  panelMargins: { left: number, top: number, right: number, bottom: number }
  /** Resolved dock layout. Governs the panel↔dock overlap. */
  layout?: DockLayout
}>()

const context = props.context
const { selected, panelMargins } = toRefs(props)

const layout = computed(() => props.layout ?? DEFAULT_DOCK_LAYOUT)

// When the open entry belongs to a group, surface its siblings in a sidebar.
const activeGroup = computed(() => getEntryGroup(context.docks.entries, selected.value))

const windowSize = reactive(useWindowSize())
const isHovering = ref(false)
const mousePosition = reactive({ x: 0, y: 0 })

const dockPanel = useTemplateRef<HTMLDivElement>('dockPanel')
const viewsContainer = useTemplateRef<HTMLElement>('viewsContainer')
const panes = useIframePanes(viewsContainer, context.panel)

function openContextMenu(e: MouseEvent) {
  if (!dockPanel.value)
    return
  const entry = selected.value
  if (!entry)
    return
  e.preventDefault()
  openDockContextMenu({
    context,
    entry,
    el: dockPanel.value,
    gap: 6,
  })
}

const anchorPos = computed(() => {
  const store = context.panel.store

  return resolveDockAnchor({
    edge: store.position,
    leftPercent: store.left,
    topPercent: store.top,
    viewportWidth: windowSize.width,
    viewportHeight: windowSize.height,
    dockWidth: props.dockEl?.clientWidth || 0,
    dockHeight: props.dockEl?.clientHeight || 0,
    margins: panelMargins.value,
  })
})

let _timer: ReturnType<typeof setTimeout> | null = null
function bringUp() {
  isHovering.value = true
  if (context.panel.store.inactiveTimeout < 0)
    return
  if (_timer)
    clearTimeout(_timer)
  _timer = setTimeout(() => {
    isHovering.value = false
  }, +context.panel.store.inactiveTimeout || 0)
}

const { width: frameWidth, height: frameHeight } = useElementBounding(dockPanel)

const panelStyle = computed(() => {
  // eslint-disable-next-line no-sequences, ts/no-unused-expressions
  mousePosition.x, mousePosition.y

  const dockThickness = props.dockEl?.clientHeight || 0
  const halfHeight = dockThickness * (1 - layout.value.panelOverlapFactor)

  const frameMargin = {
    left: panelMargins.value.left + halfHeight,
    top: panelMargins.value.top + halfHeight,
    right: panelMargins.value.right + halfHeight,
    bottom: panelMargins.value.bottom + halfHeight,
  }

  const panel = context.panel
  const store = panel.store

  // The panel's docked edge is otherwise pinned to the dock's center (a 50%
  // overlap). Shift it away from the edge so the dock only overlaps the panel
  // by `panelOverlapFactor` of its thickness — `0.5` keeps the legacy overlap,
  // lower values slide the panel clear of the bar.
  const overlapOffset = dockThickness * (0.5 - layout.value.panelOverlapFactor)
  const isVerticalDock = store.position === 'left' || store.position === 'right'

  const marginHorizontal = frameMargin.left + frameMargin.right + (isVerticalDock ? overlapOffset : 0)
  const marginVertical = frameMargin.top + frameMargin.bottom + (isVerticalDock ? 0 : overlapOffset)

  const maxWidth = windowSize.width - marginHorizontal
  const maxHeight = windowSize.height - marginVertical

  const style: CSSProperties = {
    position: 'fixed',
    pointerEvents: (panel.isDragging || panel.isResizing) ? 'none' : 'auto',
    width: `min(${store.width}vw, calc(100vw - ${marginHorizontal}px))`,
    height: `min(${store.height}vh, calc(100vh - ${marginVertical}px))`,
  }

  const anchor = anchorPos.value
  const width = Math.min(maxWidth, store.width * windowSize.width / 100)
  const height = Math.min(maxHeight, store.height * windowSize.height / 100)

  const anchorX = anchor?.left || 0
  const anchorY = anchor?.top || 0

  switch (store.position) {
    case 'top':
    case 'bottom':
      style.left = `${-frameWidth.value / 2}px`
      style.transform = 'translate(0, 0)'
      if ((anchorX - frameMargin.left) < width / 2)
        style.left = `${width / 2 - anchorX + frameMargin.left - frameWidth.value / 2}px`
      else if ((windowSize.width - anchorX - frameMargin.right) < width / 2)
        style.left = `${windowSize.width - anchorX - width / 2 - frameMargin.right - frameWidth.value / 2}px`
      break
    case 'right':
    case 'left':
      style.top = `${-frameHeight.value / 2}px`
      style.transform = 'translate(0, 0)'
      if ((anchorY - frameMargin.top) < height / 2)
        style.top = `${height / 2 - anchorY + frameMargin.top - frameHeight.value / 2}px`
      else if ((windowSize.height - anchorY - frameMargin.bottom) < height / 2)
        style.top = `${windowSize.height - anchorY - height / 2 - frameMargin.bottom - frameHeight.value / 2}px`
      break
  }

  switch (store.position) {
    case 'top':
      style.top = `${overlapOffset}px`
      break
    case 'right':
      style.right = `${overlapOffset}px`
      break
    case 'left':
      style.left = `${overlapOffset}px`
      break
    case 'bottom':
    default:
      style.bottom = `${overlapOffset}px`
      break
  }

  return style
})

onMounted(() => {
  bringUp()
})
</script>

<template>
  <div
    v-show="context.docks.selected && context.docks.selected.type !== 'action'"
    ref="dockPanel"
    class="bg-glass:75 rounded-lg border border-base color-base shadow overflow-hidden"
    :style="panelStyle"
    @contextmenu="openContextMenu"
  >
    <DockPanelResizer :panel="context.panel" />
    <div class="flex w-full h-full">
      <DockGroupSidebar
        v-if="activeGroup"
        :context
        :group="activeGroup"
        :selected-id="selected?.id ?? null"
      />
      <div class="relative flex-1 min-w-0 h-full">
        <slot name="view" :entry="selected">
          <ViewEntry
            v-if="selected && panes"
            :key="selected.id"
            :context
            :entry="selected"
            :panes="panes"
            :iframe-style="{
              border: 'none',
              borderRadius: '0.5rem',
            }"
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
