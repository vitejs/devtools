<script setup lang="ts">
import type { DevtoolsViewTab } from '@vitejs/devtools-kit'
import type { CSSProperties } from 'vue'
import type { DevToolsFrameState } from './FloatingPanelProps'
import { useElementBounding, useEventListener, useScreenSafeArea } from '@vueuse/core'
import { computed, onMounted, reactive, ref, toRefs, useTemplateRef, watchEffect } from 'vue'
import ViewFrameHandlers from './ViewFrameHandlers.vue'

const props = defineProps<{
  state: DevToolsFrameState
  view: DevtoolsViewTab
}>()

const { state, view } = toRefs(props)

const panelMargins = reactive({
  left: 10,
  top: 10,
  right: 10,
  bottom: 10,
})

const frameBox = useTemplateRef<HTMLDivElement>('frameBox')
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

// const frameBox = useTemplateRef<HTMLDivElement>('frameBox')
const panelEl = useTemplateRef<HTMLDivElement>('panelEl')

const windowSize = reactive({
  width: window.innerWidth,
  height: window.innerHeight,
})
const isDragging = ref(false)
const draggingOffset = reactive({ x: 0, y: 0 })
const mousePosition = reactive({ x: 0, y: 0 })

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

const { width: frameWidth, height: frameHeight } = useElementBounding(frameBox)

const iframeStyle = computed(() => {
  // eslint-disable-next-line no-sequences, ts/no-unused-expressions
  mousePosition.x, mousePosition.y

  const halfHeight = (panelEl.value?.clientHeight || 0) / 2

  const frameMargin = {
    left: panelMargins.left + halfHeight,
    top: panelMargins.top + halfHeight,
    right: panelMargins.right + halfHeight,
    bottom: panelMargins.bottom + halfHeight,
  }

  const marginHorizontal = frameMargin.left + frameMargin.right
  const marginVertical = frameMargin.top + frameMargin.bottom

  const maxWidth = windowSize.width - marginHorizontal
  const maxHeight = windowSize.height - marginVertical

  const style: CSSProperties = {
    position: 'fixed',
    zIndex: -1,
    pointerEvents: (isDragging.value || !state.value.open) ? 'none' : 'auto',
    width: `min(${state.value.width}vw, calc(100vw - ${marginHorizontal}px))`,
    height: `min(${state.value.height}vh, calc(100vh - ${marginVertical}px))`,
  }

  const anchor = anchorPos.value
  const width = Math.min(maxWidth, state.value.width * windowSize.width / 100)
  const height = Math.min(maxHeight, state.value.height * windowSize.height / 100)

  const anchorX = anchor?.left || 0
  const anchorY = anchor?.top || 0

  switch (state.value.position) {
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

  switch (state.value.position) {
    case 'top':
      style.top = 0
      break
    case 'right':
      style.right = 0
      break
    case 'left':
      style.left = 0
      break
    case 'bottom':
    default:
      style.bottom = 0
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
    ref="frameBox"
    :style="iframeStyle"
  >
    <ViewFrameHandlers
      :state
      :is-dragging="isDragging"
    />
  </div>
</template>
