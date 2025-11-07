<script setup lang="ts">
import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { CSSProperties } from 'vue'
import type { DockContext } from '../state/dock'
import { useElementBounding, useWindowSize } from '@vueuse/core'
import { computed, markRaw, onMounted, reactive, ref, toRefs, useTemplateRef } from 'vue'
import { PresistedDomViewsManager } from '../utils/PresistedDomViewsManager'
import DockPanelResizer from './DockPanelResizer.vue'
import ViewEntry from './ViewEntry.vue'

const props = defineProps<{
  context: DockContext
  selected: DevToolsDockEntry | null
  dockEl?: HTMLDivElement
  panelMargins: { left: number, top: number, right: number, bottom: number }
}>()

const context = props.context
const { selected, panelMargins } = toRefs(props)

const windowSize = reactive(useWindowSize())
const isHovering = ref(false)
const mousePosition = reactive({ x: 0, y: 0 })

const dockPanel = useTemplateRef<HTMLDivElement>('dockPanel')
const viewsContainer = useTemplateRef<HTMLElement>('viewsContainer')
const presistedDoms = markRaw(new PresistedDomViewsManager(viewsContainer))

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const anchorPos = computed(() => {
  const halfWidth = (props.dockEl?.clientWidth || 0) / 2
  const halfHeight = (props.dockEl?.clientHeight || 0) / 2

  const left = context.state.left * windowSize.width / 100
  const top = context.state.top * windowSize.height / 100

  switch (context.state.position) {
    case 'top':
      return {
        left: clamp(left, halfWidth + panelMargins.value.left, windowSize.width - halfWidth - panelMargins.value.right),
        top: panelMargins.value.top + halfHeight,
      }
    case 'right':
      return {
        left: windowSize.width - panelMargins.value.right - halfHeight,
        top: clamp(top, halfWidth + panelMargins.value.top, windowSize.height - halfWidth - panelMargins.value.bottom),
      }
    case 'left':
      return {
        left: panelMargins.value.left + halfHeight,
        top: clamp(top, halfWidth + panelMargins.value.top, windowSize.height - halfWidth - panelMargins.value.bottom),
      }
    case 'bottom':
    default:
      return {
        left: clamp(left, halfWidth + panelMargins.value.left, windowSize.width - halfWidth - panelMargins.value.right),
        top: windowSize.height - panelMargins.value.bottom - halfHeight,
      }
  }
})

let _timer: ReturnType<typeof setTimeout> | null = null
function bringUp() {
  isHovering.value = true
  if (context.state.minimizePanelInactive < 0)
    return
  if (_timer)
    clearTimeout(_timer)
  _timer = setTimeout(() => {
    isHovering.value = false
  }, +context.state.minimizePanelInactive || 0)
}

const { width: frameWidth, height: frameHeight } = useElementBounding(dockPanel)

const iframeStyle = computed(() => {
  // eslint-disable-next-line no-sequences, ts/no-unused-expressions
  mousePosition.x, mousePosition.y

  const halfHeight = (props.dockEl?.clientHeight || 0) / 2

  const frameMargin = {
    left: panelMargins.value.left + halfHeight,
    top: panelMargins.value.top + halfHeight,
    right: panelMargins.value.right + halfHeight,
    bottom: panelMargins.value.bottom + halfHeight,
  }

  const marginHorizontal = frameMargin.left + frameMargin.right
  const marginVertical = frameMargin.top + frameMargin.bottom

  const maxWidth = windowSize.width - marginHorizontal
  const maxHeight = windowSize.height - marginVertical

  const style: CSSProperties = {
    position: 'fixed',
    zIndex: -1,
    pointerEvents: (context.isDragging || context.isResizing) ? 'none' : 'auto',
    width: `min(${context.state.width}vw, calc(100vw - ${marginHorizontal}px))`,
    height: `min(${context.state.height}vh, calc(100vh - ${marginVertical}px))`,
  }

  const anchor = anchorPos.value
  const width = Math.min(maxWidth, context.state.width * windowSize.width / 100)
  const height = Math.min(maxHeight, context.state.height * windowSize.height / 100)

  const anchorX = anchor?.left || 0
  const anchorY = anchor?.top || 0

  switch (context.state.position) {
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

  switch (context.state.position) {
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
    v-show="context.selected"
    ref="dockPanel"
    class="bg-glass rounded-lg border border-base shadow"
    :style="iframeStyle"
  >
    <DockPanelResizer
      v-model:is-resizing="context.isResizing"
      :is-dragging="context.isDragging"
      :state="context.state"
    />
    <ViewEntry
      v-if="selected && viewsContainer"
      :key="selected.id"
      :context
      :entry="selected"
      :presisted-doms="presistedDoms"
      :iframe-style="{
        border: '1px solid #8883',
        borderRadius: '0.5rem',
      }"
      rounded
    />
    <div
      id="vite-devtools-views-container"
      ref="viewsContainer"
      class="absolute inset-0"
    />
  </div>
</template>
