<script setup lang="ts">
import type { DockProps } from './DockProps'
import { useEventListener, useScreenSafeArea } from '@vueuse/core'
import { computed, onMounted, reactive, ref, toRefs, useTemplateRef, watchEffect } from 'vue'
import ViewFrame from './ViewFrame.vue'
// import FrameBox from './NuxtDevToolsFrameBox.vue'

// const props = defineProps<{
// }>()

const props = defineProps<DockProps>()

const { state, docks } = toRefs(props)

const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')

const panelMargins = reactive({
  left: 10,
  top: 10,
  right: 10,
  bottom: 10,
})

const safeArea = useScreenSafeArea()

function toNumber(value: string) {
  const num = +value
  if (Number.isNaN(num))
    return 0
  return num
}

const vars = computed(() => {
  const isDark = true // TODO
  // const dark = props.client.app.colorMode.value === 'dark'
  return {
    '--vite-devtools-widget-bg': isDark ? '#111' : '#ffffff',
    '--vite-devtools-widget-fg': isDark ? '#F5F5F5' : '#111',
    '--vite-devtools-widget-border': isDark ? '#3336' : '#efefef',
    '--vite-devtools-widget-shadow': isDark ? 'rgba(0,0,0,0.3)' : 'rgba(128,128,128,0.1)',
  }
})

watchEffect(() => {
  panelMargins.left = toNumber(safeArea.left.value) + 10
  panelMargins.top = toNumber(safeArea.top.value) + 10
  panelMargins.right = toNumber(safeArea.right.value) + 10
  panelMargins.bottom = toNumber(safeArea.bottom.value) + 10
})

const SNAP_THRESHOLD = 2

const panelEl = useTemplateRef<HTMLDivElement>('panelEl')
const anchorEl = useTemplateRef<HTMLDivElement>('anchorEl')

const windowSize = reactive({
  width: window.innerWidth,
  height: window.innerHeight,
})
const isDragging = ref(false)
const draggingOffset = reactive({ x: 0, y: 0 })
const mousePosition = reactive({ x: 0, y: 0 })

function onPointerDown(e: PointerEvent) {
  if (!panelEl.value)
    return
  isDragging.value = true
  const { left, top, width, height } = panelEl.value!.getBoundingClientRect()
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

const isHovering = ref(false)
const isVertical = computed(() => state.value.position === 'left' || state.value.position === 'right')

const anchorPos = computed(() => {
  const halfWidth = (panelEl.value?.clientWidth || 0) / 2
  const halfHeight = (panelEl.value?.clientHeight || 0) / 2

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
      ? `translate(${isMinimized.value ? `calc(-50% ${state.value.position === 'right' ? '+' : '-'} 15px)` : '-50%'}, -50%) rotate(90deg)`
      : `translate(-50%, ${isMinimized.value ? `calc(-50% ${state.value.position === 'top' ? '-' : '+'} 15px)` : '-50%'})`,
  }
  if (isHidden.value) {
    style.opacity = 0
    style.pointerEvents = 'none'
  }
  if (isDragging.value)
    style.transition = 'none !important'
  return style
})

// const { width: frameWidth, height: frameHeight } = useElementBounding(frameBox)

// const popupWindow = ref<Window | null>(null)

// const iframeStyle = computed(() => {
//   // eslint-disable-next-line no-sequences, ts/no-unused-expressions
//   mousePosition.x, mousePosition.y

//   const halfHeight = (panelEl.value?.clientHeight || 0) / 2

//   const frameMargin = {
//     left: panelMargins.left + halfHeight,
//     top: panelMargins.top + halfHeight,
//     right: panelMargins.right + halfHeight,
//     bottom: panelMargins.bottom + halfHeight,
//   }

//   const marginHorizontal = frameMargin.left + frameMargin.right
//   const marginVertical = frameMargin.top + frameMargin.bottom

//   const maxWidth = windowSize.width - marginHorizontal
//   const maxHeight = windowSize.height - marginVertical

//   const style: CSSProperties = {
//     position: 'fixed',
//     zIndex: -1,
//     pointerEvents: (isDragging.value || !state.value.open) ? 'none' : 'auto',
//     width: `min(${state.value.width}vw, calc(100vw - ${marginHorizontal}px))`,
//     height: `min(${state.value.height}vh, calc(100vh - ${marginVertical}px))`,
//   }

//   const anchor = anchorPos.value
//   const width = Math.min(maxWidth, state.value.width * windowSize.width / 100)
//   const height = Math.min(maxHeight, state.value.height * windowSize.height / 100)

//   const anchorX = anchor?.left || 0
//   const anchorY = anchor?.top || 0

//   switch (state.value.position) {
//     case 'top':
//     case 'bottom':
//       style.left = `${-frameWidth.value / 2}px`
//       style.transform = 'translate(0, 0)'
//       if ((anchorX - frameMargin.left) < width / 2)
//         style.left = `${width / 2 - anchorX + frameMargin.left - frameWidth.value / 2}px`
//       else if ((windowSize.width - anchorX - frameMargin.right) < width / 2)
//         style.left = `${windowSize.width - anchorX - width / 2 - frameMargin.right - frameWidth.value / 2}px`
//       break
//     case 'right':
//     case 'left':
//       style.top = `${-frameHeight.value / 2}px`
//       style.transform = 'translate(0, 0)'
//       if ((anchorY - frameMargin.top) < height / 2)
//         style.top = `${height / 2 - anchorY + frameMargin.top - frameHeight.value / 2}px`
//       else if ((windowSize.height - anchorY - frameMargin.bottom) < height / 2)
//         style.top = `${windowSize.height - anchorY - height / 2 - frameMargin.bottom - frameHeight.value / 2}px`
//       break
//   }

//   switch (state.value.position) {
//     case 'top':
//       style.top = 0
//       break
//     case 'right':
//       style.right = 0
//       break
//     case 'left':
//       style.left = 0
//       break
//     case 'bottom':
//     default:
//       style.bottom = 0
//       break
//   }

//   return style
// })

onMounted(() => {
  bringUp()
})
</script>

<template>
  <div
    id="vite-devtools-anchor"
    ref="anchorEl"
    :style="[anchorStyle, vars]"
    :class="{
      'vite-devtools-vertical': isVertical,
      'vite-devtools-minimized': isMinimized,
    }"
    @mousemove="bringUp"
  >
    <div
      v-if="!isSafari"
      class="vite-devtools-glowing"
      :style="isDragging ? 'opacity: 0.6 !important' : ''"
    />
    <div
      ref="panelEl"
      class="vite-devtools-panel"
      :style="panelStyle"
      @pointerdown="onPointerDown"
    >
      <div class="flex items-center w-full h-full justify-center px2 gap-2 transition-opacity duration-300" :class="isMinimized ? 'opacity-0' : 'opacity-100'">
        <button
          v-for="dock in docks"
          :key="dock.id"
          :title="dock.title"
          :class="isVertical ? 'rotate-270' : ''"
          class="flex items-center justify-center p1 rounded-full hover:bg-[#8881]"
        >
          <img :src="dock.icon" :alt="dock.title" class="w-6 h-6 select-none" draggable="false">
        </button>
      </div>
    </div>

    <ViewFrame
      :entry="docks[0]"
    />
  </div>
</template>
