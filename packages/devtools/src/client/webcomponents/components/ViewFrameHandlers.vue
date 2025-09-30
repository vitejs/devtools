<script setup lang="ts">
import type { DevToolsDockState } from './DockProps'
import { toRefs, useEventListener } from '@vueuse/core'
import { ref, watch } from 'vue'

const props = defineProps<{
  state: DevToolsDockState
  isDragging: boolean
}>()

const isResizing = defineModel<boolean>('isResizing', { default: false })

const PANEL_MIN = 20
const PANEL_MAX = 100

const {
  state,
} = toRefs(props)

const container = ref<HTMLElement>()
const resizingState = ref<false | { top?: boolean, left?: boolean, right?: boolean, bottom?: boolean }>(false)

// Close panel on outside click (when enabled)
// useEventListener(window, 'mousedown', (e: MouseEvent) => {
//   if (!state.value.closeOnOutsideClick)
//     return
//   if (popupWindow.value)
//     return
//   if (!state.value.open || isResizing.value || props.client.inspector?.isEnabled.value)
//     return

//   const matched = e.composedPath().find((_el) => {
//     const el = _el as HTMLElement
//     return Array.from(el.classList || []).some(c => c.startsWith('nuxt-devtools-'))
//       || el.tagName?.toLowerCase() === 'iframe'
//   })

//   if (!matched)
//     state.value.open = false
// })

function handleResize(e: MouseEvent | TouchEvent) {
  if (!resizingState.value)
    return

  const box = container.value?.getBoundingClientRect()
  if (!box)
    return

  let widthPx: number, heightPx: number
  if (resizingState.value.right) {
    widthPx = Math.abs(e instanceof MouseEvent ? e.clientX : (e.touches[0]?.clientX || 0) - (box?.left || 0))
    state.value.width = Math.min(PANEL_MAX, Math.max(PANEL_MIN, widthPx / window.innerWidth * 100))
  }
  else if (resizingState.value.left) {
    widthPx = Math.abs((box?.right || 0) - (e instanceof MouseEvent ? e.clientX : (e.touches[0]?.clientX || 0)))
    state.value.width = Math.min(PANEL_MAX, Math.max(PANEL_MIN, widthPx / window.innerWidth * 100))
  }

  if (resizingState.value.top) {
    heightPx = Math.abs((box?.bottom || 0) - (e instanceof MouseEvent ? e.clientY : (e.touches[0]?.clientY || 0)))
    state.value.height = Math.min(PANEL_MAX, Math.max(PANEL_MIN, heightPx / window.innerHeight * 100))
  }
  else if (resizingState.value.bottom) {
    heightPx = Math.abs(e instanceof MouseEvent ? e.clientY : (e.touches[0]?.clientY || 0) - (box?.top || 0))
    state.value.height = Math.min(PANEL_MAX, Math.max(PANEL_MIN, heightPx / window.innerHeight * 100))
  }
}

useEventListener(window, 'mousemove', handleResize)
useEventListener(window, 'touchmove', handleResize)
useEventListener(window, 'mouseup', () => resizingState.value = false)
useEventListener(window, 'touchend', () => resizingState.value = false)
useEventListener(window, 'mouseleave', () => resizingState.value = false)

watch(
  resizingState,
  (value) => {
    isResizing.value = !!value
  },
  { flush: 'sync' },
)
</script>

<template>
  <div
    id="vite-devtools-resize-container"
    ref="container"
    class="w-full h-full absolute left-0 right-0 bottom-0 top-0 z-[2147483645] antialiased"
  >
    <!-- Handlers -->
    <div
      v-show="state.position !== 'top'"
      class="vite-devtools-resize-handle vite-devtools-resize-handle-horizontal"
      :style="{ top: 0 }"
      @mousedown.prevent="resizingState = { top: true }"
      @touchstart.passive="() => resizingState = { top: true }"
    />
    <div
      v-show="state.position !== 'bottom'"
      class="vite-devtools-resize-handle vite-devtools-resize-handle-horizontal"
      :style="{ bottom: 0 }"
      @mousedown.prevent="() => resizingState = { bottom: true }"
      @touchstart.passive="() => resizingState = { bottom: true }"
    />
    <div
      v-show="state.position !== 'left'"
      class="vite-devtools-resize-handle vite-devtools-resize-handle-vertical"
      :style="{ left: 0 }"
      @mousedown.prevent="() => resizingState = { left: true }"
      @touchstart.passive="() => resizingState = { left: true }"
    />
    <div
      v-show="state.position !== 'right'"
      class="vite-devtools-resize-handle vite-devtools-resize-handle-vertical"
      :style="{ right: 0 }"
      @mousedown.prevent="() => resizingState = { right: true }"
      @touchstart.passive="() => resizingState = { right: true }"
    />
    <div
      v-show="state.position !== 'top' && state.position !== 'left'"
      class="vite-devtools-resize-handle vite-devtools-resize-handle-corner"
      :style="{ top: 0, left: 0, cursor: 'nwse-resize' }"
      @mousedown.prevent="() => resizingState = { top: true, left: true }"
      @touchstart.passive="() => resizingState = { top: true, left: true }"
    />
    <div
      v-show="state.position !== 'top' && state.position !== 'right'"
      class="vite-devtools-resize-handle vite-devtools-resize-handle-corner"
      :style="{ top: 0, right: 0, cursor: 'nesw-resize' }"
      @mousedown.prevent="() => resizingState = { top: true, right: true }"
      @touchstart.passive="() => resizingState = { top: true, right: true }"
    />
    <div
      v-show="state.position !== 'bottom' && state.position !== 'left'"
      class="vite-devtools-resize-handle vite-devtools-resize-handle-corner"
      :style="{ bottom: 0, left: 0, cursor: 'nesw-resize' }"
      @mousedown.prevent="() => resizingState = { bottom: true, left: true }"
      @touchstart.passive="() => resizingState = { bottom: true, left: true }"
    />
    <div
      v-show="state.position !== 'bottom' && state.position !== 'right'"
      class="vite-devtools-resize-handle vite-devtools-resize-handle-corner"
      :style="{ bottom: 0, right: 0, cursor: 'nwse-resize' }"
      @mousedown.prevent="() => resizingState = { bottom: true, right: true }"
      @touchstart.passive="() => resizingState = { bottom: true, right: true }"
    />
  </div>
</template>
