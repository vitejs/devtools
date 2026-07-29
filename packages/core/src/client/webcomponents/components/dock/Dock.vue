<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { CSSProperties } from 'vue'
import type { DockLayout } from './dock-layout'
import { useEventListener, useScreenSafeArea, whenever } from '@vueuse/core'
import { computed, onMounted, reactive, ref, useTemplateRef } from 'vue'
import { BUILTIN_ENTRY_CLIENT_AUTH_NOTICE } from '../../constants'
import { docksSplitGroupsWithCapacity } from '../../state/dock-settings'
import { setDocksOverflowPanel } from '../../state/floating-tooltip'
import { useIsRpcTrusted } from '../../utils/useIsRpcTrusted'
import BracketLeft from '../icons/BracketLeft.vue'
import BracketRight from '../icons/BracketRight.vue'
import VitePlusCore from '../icons/VitePlusCore.vue'
import {
  dockLayoutCssVars,
  resolveDockAnchor,
  resolveDockEdge,
  resolveDockLayout,
  resolveViewportMargins,
  snapDockPercent,
} from './dock-layout'
import DockEntriesWithCategories from './DockEntriesWithCategories.vue'
import DockOverflowButton from './DockOverflowButton.vue'

const props = defineProps<{
  context: DocksContext
  /**
   * Override individual dock layout tunables (bar height, item capacity,
   * viewport margin, snapping, ...). Merged over `DEFAULT_DOCK_LAYOUT`.
   */
  layout?: Partial<DockLayout>
}>()

// Here we directly destructure is as we don't expect context to be changed
const context = props.context

const layout = computed(() => resolveDockLayout(props.layout))

const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')

const safeArea = useScreenSafeArea()

function toNumber(value: string) {
  const num = +value
  if (Number.isNaN(num))
    return 0
  return num
}

// Effective spacing from the viewport edge: device safe-area insets plus the
// configured viewport margin. Passed down to the panel so both stay in sync.
const panelMargins = computed(() => resolveViewportMargins(
  {
    left: toNumber(safeArea.left.value),
    top: toNumber(safeArea.top.value),
    right: toNumber(safeArea.right.value),
    bottom: toNumber(safeArea.bottom.value),
  },
  layout.value,
))

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

const isRpcTrusted = useIsRpcTrusted(context, (isTrusted) => {
  if (isTrusted && context.docks.selected?.id === BUILTIN_ENTRY_CLIENT_AUTH_NOTICE.id) {
    context.docks.switchEntry(null)
  }
  else if (!isTrusted) {
    // On revocation: close current tab and panel
    context.docks.switchEntry(null)
    context.panel.store.open = false
  }
})

const groupedEntries = computed(() => context.docks.groupedEntries)

const splitEntries = computed(() => {
  return docksSplitGroupsWithCapacity(groupedEntries.value, layout.value.maxVisibleItems)
})

const selectedEntry = computed(() => {
  return context.docks.selected
})

onMounted(async () => {
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

    const x = e.clientX - draggingOffset.x
    const y = e.clientY - draggingOffset.y

    if (Number.isNaN(x) || Number.isNaN(y))
      return

    mousePosition.x = x
    mousePosition.y = y

    store.position = resolveDockEdge({
      x,
      y,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      layout: layout.value,
    })

    store.left = snapDockPercent(x / window.innerWidth * 100, layout.value)
    store.top = snapDockPercent(y / window.innerHeight * 100, layout.value)
  })
  useEventListener(window, 'pointerup', () => {
    context.panel.isDragging = false
  })
  useEventListener(window, 'pointerleave', () => {
    context.panel.isDragging = false
  })
})

const anchorPos = computed(() => {
  // eslint-disable-next-line ts/no-unused-expressions
  recalculateCounter.value

  const store = context.panel.store

  return resolveDockAnchor({
    edge: store.position,
    leftPercent: store.left,
    topPercent: store.top,
    viewportWidth: windowSize.width,
    viewportHeight: windowSize.height,
    dockWidth: dockEl.value?.clientWidth || 0,
    dockHeight: dockEl.value?.clientHeight || 0,
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

const anchorStyle = computed<CSSProperties>(() => {
  return {
    ...dockLayoutCssVars(layout.value),
    left: `${anchorPos.value.left}px`,
    top: `${anchorPos.value.top}px`,
    pointerEvents: isHidden.value ? 'none' : 'auto',
  }
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

whenever(isMinimized, () => {
  setDocksOverflowPanel(null)
})

onMounted(() => {
  if (context.panel.store.open && !isRpcTrusted.value)
    context.panel.store.open = false
  if (isRpcTrusted.value)
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
    class="color-base"
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
      :layout="layout"
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
        <div
          class="w-3 h-3 absolute left-1/2 top-1/2 translate-x--1/2 translate-y--1/2 transition-opacity duration-300"
          :class="[
            isMinimized ? 'op100' : 'op0',
            context.panel.isVertical ? 'rotate-270' : 'rotate-0',
          ]"
        >
          <VitePlusCore />
          <div v-if="!isRpcTrusted" class="i-fluent-emoji-flat-warning absolute bottom-0 right--1px w-1.5 h-1.5" />
        </div>
        <div
          v-if="!isRpcTrusted"
          class="transition duration-300 delay-200"
          :class="isMinimized ? 'opacity-0 pointer-events-none ws-nowrap text-sm text-orange of-hidden' : 'opacity-100'"
        >
          <button
            class="p2 transition hover:bg-active rounded-full px4"
            @click="context.docks.toggleEntry(BUILTIN_ENTRY_CLIENT_AUTH_NOTICE.id)"
          >
            <div class="flex items-center gap-1">
              <div
                class="i-fluent-emoji-flat-warning flex-none"
                :class="context.panel.isVertical ? 'rotate-270' : 'rotate-0'"
              />
              <div class="ws-nowrap text-amber">
                Unauthorized
              </div>
            </div>
          </button>
        </div>
        <div
          :class="isMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'"
          class="transition duration-200 flex items-center w-full h-full justify-center px3"
        >
          <DockEntriesWithCategories
            :context="context"
            :groups="splitEntries.visible"
            :is-vertical="context.panel.isVertical"
            :selected="selectedEntry"
            @select="(e) => context.docks.switchEntry(e?.id)"
          />

          <template v-if="splitEntries.overflow.length > 0">
            <div class="border-base m1 h-20px w-px border-r-1.5" />
            <DockOverflowButton
              :context="context"
              :is-vertical="context.panel.isVertical"
              :groups="splitEntries.overflow"
              :selected="selectedEntry"
              @select="(e) => context.docks.switchEntry(e?.id)"
              @activity="bringUp"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
