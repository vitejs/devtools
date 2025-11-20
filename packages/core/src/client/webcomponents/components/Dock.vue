<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { useEventListener, useScreenSafeArea } from '@vueuse/core'
import { computed, onMounted, reactive, ref, useTemplateRef, watchEffect } from 'vue'
import { useStateHandlers } from '../state/__todo-refactor'
import DockEntries from './DockEntries.vue'
import BracketLeft from './icons/BracketLeft.vue'
import BracketRight from './icons/BracketRight.vue'
import VitePlusCore from './icons/VitePlusCore.vue'

const props = defineProps<{
  context: DocksContext
}>()

// Here we directly destructure is as we don't expect context to be changed
const context = props.context

const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')

const PANEL_MARGIN = 5
const panelMargins = reactive({
  left: PANEL_MARGIN,
  top: PANEL_MARGIN,
  right: PANEL_MARGIN,
  bottom: PANEL_MARGIN,
})

const safeArea = useScreenSafeArea()

function toNumber(value: string) {
  const num = +value
  if (Number.isNaN(num))
    return 0
  return num
}

watchEffect(() => {
  panelMargins.left = toNumber(safeArea.left.value) + PANEL_MARGIN
  panelMargins.top = toNumber(safeArea.top.value) + PANEL_MARGIN
  panelMargins.right = toNumber(safeArea.right.value) + PANEL_MARGIN
  panelMargins.bottom = toNumber(safeArea.bottom.value) + PANEL_MARGIN
})

const SNAP_THRESHOLD = 2

const dockEl = useTemplateRef<HTMLDivElement>('dockEl')
const anchorEl = useTemplateRef<HTMLDivElement>('anchorEl')

const recalculateCounter = ref(0)
const isHovering = ref(false)

const windowSize = reactive({
  width: window.innerWidth,
  height: window.innerHeight,
})
const draggingOffset = reactive({ x: 0, y: 0 })
const mousePosition = reactive({ x: 0, y: 0 })

function onPointerDown(e: PointerEvent) {
  if (!dockEl.value)
    return
  context.panel.isDragging = true
  const { left, top, width, height } = dockEl.value!.getBoundingClientRect()
  draggingOffset.x = e.clientX - left - width / 2
  draggingOffset.y = e.clientY - top - height / 2
}

onMounted(() => {
  windowSize.width = window.innerWidth
  windowSize.height = window.innerHeight

  useEventListener(window, 'resize', () => {
    windowSize.width = window.innerWidth
    windowSize.height = window.innerHeight
  })

  useEventListener(window, 'pointermove', (e: PointerEvent) => {
    if (!context.panel.isDragging)
      return

    const store = context.panel.store
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2

    const x = e.clientX - draggingOffset.x
    const y = e.clientY - draggingOffset.y

    if (Number.isNaN(x) || Number.isNaN(y))
      return

    mousePosition.x = x
    mousePosition.y = y

    // Get position
    const deg = Math.atan2(y - centerY, x - centerX)
    const HORIZONTAL_MARGIN = 70
    const TL = Math.atan2(0 - centerY + HORIZONTAL_MARGIN, 0 - centerX)
    const TR = Math.atan2(0 - centerY + HORIZONTAL_MARGIN, window.innerWidth - centerX)
    const BL = Math.atan2(window.innerHeight - HORIZONTAL_MARGIN - centerY, 0 - centerX)
    const BR = Math.atan2(window.innerHeight - HORIZONTAL_MARGIN - centerY, window.innerWidth - centerX)

    store.position = deg >= TL && deg <= TR
      ? 'top'
      : deg >= TR && deg <= BR
        ? 'right'
        : deg >= BR && deg <= BL
          ? 'bottom'
          : 'left'

    store.left = snapToPoints(x / window.innerWidth * 100)
    store.top = snapToPoints(y / window.innerHeight * 100)
  })
  useEventListener(window, 'pointerup', () => {
    context.panel.isDragging = false
  })
  useEventListener(window, 'pointerleave', () => {
    context.panel.isDragging = false
  })
})

function snapToPoints(value: number) {
  if (value < 5)
    return 0
  if (value > 95)
    return 100
  if (Math.abs(value - 50) < SNAP_THRESHOLD)
    return 50
  return value
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const anchorPos = computed(() => {
  // eslint-disable-next-line ts/no-unused-expressions
  recalculateCounter.value

  const store = context.panel.store

  const halfWidth = (dockEl.value?.clientWidth || 0) / 2
  const halfHeight = (dockEl.value?.clientHeight || 0) / 2

  const left = store.left * windowSize.width / 100
  const top = store.top * windowSize.height / 100

  switch (store.position) {
    case 'top':
      return {
        left: clamp(left, halfWidth + panelMargins.left, windowSize.width - halfWidth - panelMargins.right),
        top: panelMargins.top + halfHeight,
      }
    case 'right':
      return {
        left: windowSize.width - panelMargins.right - halfHeight,
        top: clamp(top, halfWidth + panelMargins.top, windowSize.height - halfWidth - panelMargins.bottom),
      }
    case 'left':
      return {
        left: panelMargins.left + halfHeight,
        top: clamp(top, halfWidth + panelMargins.top, windowSize.height - halfWidth - panelMargins.bottom),
      }
    case 'bottom':
    default:
      return {
        left: clamp(left, halfWidth + panelMargins.left, windowSize.width - halfWidth - panelMargins.right),
        top: windowSize.height - panelMargins.bottom - halfHeight,
      }
  }
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

const isHidden = computed(() => false)

const isMinimized = computed(() => {
  if (context.panel.store.inactiveTimeout < 0)
    return false
  if (context.panel.store.inactiveTimeout === 0)
    return true
  // @ts-expect-error compatibility
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
  return !context.panel.isDragging
    && !context.panel.store.open
    && !isHovering.value
    && !isTouchDevice
    && context.panel.store.inactiveTimeout
})

const anchorStyle = computed(() => {
  return {
    left: `${anchorPos.value.left}px`,
    top: `${anchorPos.value.top}px`,
    pointerEvents: isHidden.value ? 'none' : 'auto',
  } as const
})

const panelStyle = computed(() => {
  const style: any = {
    transform: context.panel.isVertical
      ? `translate(-50%, -50%) rotate(90deg)`
      : `translate(-50%, -50%)`,
  }
  if (isHidden.value) {
    style.opacity = 0
    style.pointerEvents = 'none'
  }
  if (context.panel.isDragging)
    style.transition = 'none !important'
  return style
})

const { selectDockEntry } = useStateHandlers(context)

onMounted(() => {
  bringUp()
  recalculateCounter.value++
})
</script>

<template>
  <div
    id="vite-devtools-anchor"
    ref="anchorEl"
    :style="[anchorStyle]"
    :class="{
      'vite-devtools-horizontal': !context.panel.isVertical,
      'vite-devtools-vertical': context.panel.isVertical,
      'vite-devtools-minimized': isMinimized,
    }"
    @mousemove="bringUp"
  >
    <div
      v-if="!isSafari"
      id="vite-devtools-glowing"
      :class="context.panel.isDragging ? 'op60!' : ''"
    />
    <slot
      :context="context"
      :dock-el="dockEl"
      :selected="context.docks.selected"
      :panel-margins="panelMargins"
    />
    <div
      id="vite-devtools-dock-container"
      ref="dockEl"
      :style="panelStyle"
    >
      <div
        id="vite-devtools-dock"
        @pointerdown="onPointerDown"
      >
        <BracketLeft
          class="vite-devtools-dock-bracket absolute left--1 top-1/2 translate-y--1/2 bottom-0 w-2.5 op75 transition-opacity duration-300"
        />
        <BracketRight
          class="vite-devtools-dock-bracket absolute right--1 top-1/2 translate-y--1/2 bottom-0 w-2.5 op75 transition-opacity duration-300"
          :class="context.panel.isVertical ? 'scale-y--100' : ''"
        />
        <VitePlusCore
          class="w-3 h-3 absolute left-1/2 top-1/2 translate-x--1/2 translate-y--1/2 transition-opacity duration-300"
          :class="isMinimized ? 'op100' : 'op0'"
        />
        <DockEntries
          :entries="context.docks.entries"
          class="transition duration-200 flex items-center w-full h-full justify-center"
          :class="isMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'"
          :is-vertical="context.panel.isVertical"
          :selected="context.docks.selected"
          @select="selectDockEntry"
        />
      </div>
    </div>
  </div>
</template>
