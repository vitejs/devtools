<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { ImportScriptContext } from '@vitejs/devtools-kit/client'
import type { DockProps } from './DockProps'
import { useEventListener, useScreenSafeArea } from '@vueuse/core'
import { computed, onMounted, reactive, ref, toRefs, useTemplateRef, watchEffect } from 'vue'
import DockEntries from './DockEntries.vue'
import BracketLeft from './icons/BracketLeft.vue'
import BracketRight from './icons/BracketRight.vue'
import VitePlusCore from './icons/VitePlusCore.vue'

const props = defineProps<DockProps>()

const { state, docks } = toRefs(props)

const isDragging = defineModel<boolean>('isDragging', { default: false })

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

const windowSize = reactive({
  width: window.innerWidth,
  height: window.innerHeight,
})
const draggingOffset = reactive({ x: 0, y: 0 })
const mousePosition = reactive({ x: 0, y: 0 })

function onPointerDown(e: PointerEvent) {
  if (!dockEl.value)
    return
  isDragging.value = true
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
    if (!isDragging.value)
      return

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

    state.value.position = deg >= TL && deg <= TR
      ? 'top'
      : deg >= TR && deg <= BR
        ? 'right'
        : deg >= BR && deg <= BL
          ? 'bottom'
          : 'left'

    state.value.left = snapToPoints(x / window.innerWidth * 100)
    state.value.top = snapToPoints(y / window.innerHeight * 100)
  })
  useEventListener(window, 'pointerup', () => {
    isDragging.value = false
  })
  useEventListener(window, 'pointerleave', () => {
    isDragging.value = false
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

const recalculateCounter = ref(0)
const isHovering = ref(false)
const isVertical = computed(() => state.value.position === 'left' || state.value.position === 'right')

const anchorPos = computed(() => {
  // eslint-disable-next-line ts/no-unused-expressions
  recalculateCounter.value

  const halfWidth = (dockEl.value?.clientWidth || 0) / 2
  const halfHeight = (dockEl.value?.clientHeight || 0) / 2

  const left = state.value.left * windowSize.width / 100
  const top = state.value.top * windowSize.height / 100

  switch (state.value.position) {
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
  if (state.value.minimizePanelInactive < 0)
    return
  if (_timer)
    clearTimeout(_timer)
  _timer = setTimeout(() => {
    isHovering.value = false
  }, +state.value.minimizePanelInactive || 0)
}

const isHidden = computed(() => false)

const isMinimized = computed(() => {
  if (state.value.minimizePanelInactive < 0)
    return false
  if (state.value.minimizePanelInactive === 0)
    return true
  // @ts-expect-error compatibility
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
  return !isDragging.value
    && !state.value.open
    && !isHovering.value
    && !isTouchDevice
    && state.value.minimizePanelInactive
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
    transform: isVertical.value
      ? `translate(-50%, -50%) rotate(90deg)`
      : `translate(-50%, -50%)`,
  }
  if (isHidden.value) {
    style.opacity = 0
    style.pointerEvents = 'none'
  }
  if (isDragging.value)
    style.transition = 'none !important'
  return style
})

function importScript(entry: DevToolsDockEntry): Promise<(context: ImportScriptContext) => void | Promise<void>> {
  const id = entry.id
  return import(/* @vite-ignore */ ['/.devtools', 'imports'].join('-'))
    .then((module) => {
      const importsMap = module.importsMap as Record<string, () => Promise<() => void>>
      const importFn = importsMap[id]
      if (!importFn) {
        return Promise.reject(new Error(`[VITE DEVTOOLS] No import found for id: ${id}`))
      }
      return importFn()
    })
    .catch((error) => {
      // TODO: maybe popup a error toast here?
      // TODO: A unified logger API
      console.error('[VITE DEVTOOLS] Error executing import action', error)
      return Promise.reject(error)
    })
}

function onSelected(entry?: DevToolsDockEntry) {
  if (!entry) {
    state.value.open = false
    state.value.dockEntry = undefined
    return
  }

  const scriptContext: ImportScriptContext = reactive({
    dockEntry: entry,
    // @ts-expect-error cast for unwraping
    dockState: computed<'active' | 'inactive'>({
      get() {
        return state.value.dockEntry?.id === entry.id ? 'active' : 'inactive'
      },
      set(val) {
        if (val === 'active')
          state.value.dockEntry = entry
        else if (state.value.dockEntry?.id === entry.id)
          state.value.dockEntry = undefined
      },
    }),
    hidePanel() {
      state.value.open = false
    },
  })

  // If it's an action, run and return (early exit)
  if (entry?.type === 'action') {
    return importScript(entry).then(fn => fn(scriptContext))
  }

  state.value.dockEntry = entry
  state.value.open = true

  // If has import script, run it
  if (entry.import) {
    importScript(entry).then(fn => fn(scriptContext))
  }
}

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
      'vite-devtools-horizontal': !isVertical,
      'vite-devtools-vertical': isVertical,
      'vite-devtools-minimized': isMinimized,
    }"
    @mousemove="bringUp"
  >
    <div
      v-if="!isSafari"
      id="vite-devtools-glowing"
      :style="isDragging ? 'opacity: 0.6 !important' : ''"
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
          :class="isVertical ? 'scale-y--100' : ''"
        />
        <VitePlusCore
          class="w-3 h-3 absolute left-1/2 top-1/2 translate-x--1/2 translate-y--1/2 transition-opacity duration-300"
          :class="isMinimized ? 'op100' : 'op0'"
        />
        <DockEntries
          :entries="docks"
          class="transition duration-200"
          :class="isMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'"
          :is-vertical="isVertical"
          :selected="state.dockEntry"
          @select="onSelected"
        />
      </div>
    </div>
    <slot
      :dock-el="dockEl"
      :panel-margins="panelMargins"
      :state="state"
      :entry="state.dockEntry?.type === 'action' ? undefined : state.dockEntry"
    />
  </div>
</template>
