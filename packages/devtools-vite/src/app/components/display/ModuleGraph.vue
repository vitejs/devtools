<script setup lang="ts" generic="T extends { id: string, imports: unknown[] }, I">
import type { SessionContext } from '~~/shared/types'
import { onMounted, unref, watch } from 'vue'
import { generateLink, getModuleGraphLinkColor, useGraphDraggingScroll, useGraphZoom, useModuleGraph, useToggleGraphNodeExpanded } from '~/composables/moduleGraph'

const props = defineProps<{
  modules: T[]
  session: SessionContext
}>()

const { isFirstCalculateGraph, childToParentMap, collapsedNodes, calculateGraph, container, width, height, scale, nodes, links, spacing, nodesRefMap } = useModuleGraph()
const { isGrabbing, init: initGraphDraggingScroll } = useGraphDraggingScroll()
const { zoomIn, zoomOut, ZOOM_MIN, ZOOM_MAX } = useGraphZoom()
const { isGraphNodeToggling, toggleNode, expandAll, collapseAll } = useToggleGraphNodeExpanded({
  modules: props.modules,
})

onMounted(() => {
  initGraphDraggingScroll()

  watch(
    () => props.modules,
    () => {
      isFirstCalculateGraph.value = true
      collapsedNodes.clear()
      childToParentMap.clear()
      calculateGraph()
    },
    { immediate: true },
  )
})
</script>

<template>
  <div
    ref="container"
    w-full h-screen of-scroll relative select-none
    :class="isGrabbing ? 'cursor-grabbing' : ''"
  >
    <div
      :style="{
        width: `${width * scale}px`,
        height: `${height * scale}px`,
      }"
    >
      <div
        flex="~ items-center justify-center"
        :style="{ transform: `scale(${scale})`, transformOrigin: '0 0' }"
      >
        <div
          absolute left-0 top-0
          :style="{
            width: `${width}px`,
            height: `${height}px`,
          }"
          class="bg-dots"
        />
        <svg pointer-events-none absolute left-0 top-0 z-graph-link :width="width" :height="height">
          <g>
            <template v-for="link of links" :key="link.id">
              <slot name="link" :link="link" :d="generateLink<T, I>(link, spacing)!" :link-class="getModuleGraphLinkColor<T, I>(link)">
                <path
                  :key="link.id"
                  :d="generateLink<T, I>(link, spacing)!"
                  :class="getModuleGraphLinkColor<T, I>(link)"
                  fill="none"
                />
              </slot>
            </template>
          </g>
        </svg>
        <template
          v-for="node of nodes"
          :key="node.data.module.id"
        >
          <template v-if="node.data.module.id !== '~root'">
            <div
              absolute
              class="group z-graph-node flex gap-1 items-center"
              :style="{
                left: `${node.x}px`,
                top: `${node.y}px`,
                transform: 'translate(-50%, -50%)',
              }"
            >
              <div
                flex="~ items-center gap-1"
                bg-glass
                border="~ base rounded"
                class="group-hover:bg-active block px2 p1"
                :style="{
                  minWidth: `${unref(spacing.width)}px`,
                  maxWidth: `${unref(spacing.width)}px`,
                  maxHeight: `${unref(spacing.height)}px`,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                }"
              >
                <slot :node="node" :nodes-ref-map="nodesRefMap" />
              </div>

              <!-- Expand/Collapse Button -->
              <div class="w-4">
                <button
                  v-if="node.data.hasChildren"
                  w-4
                  h-4
                  rounded-full
                  flex="items-center justify-center"
                  text-xs
                  border="~ active"
                  class="flex cursor-pointer z-graph-node-active bg-base"
                  :disabled="isGraphNodeToggling"
                  :class="{ 'cursor-not-allowed': isGraphNodeToggling, 'hover:bg-active': !isGraphNodeToggling }"
                  :title="node.data.expanded ? 'Collapse' : 'Expand'"
                  @click.stop="toggleNode(node.data.module.id)"
                >
                  <div
                    class="text-primary h-4"
                    :class="[
                      node.data.expanded ? 'i-ph-minus' : 'i-ph-plus',
                    ]"
                    transition="transform duration-200"
                  />
                </button>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>
    <div
      fixed right-6 bottom-6 z-panel-nav flex="~ col gap-2 items-center"
    >
      <div w-10 flex="~ items-center justify-center">
        <DisplayTimeoutView :content="`${Math.round(scale * 100)}%`" class="text-sm" />
      </div>

      <div bg-glass rounded-full border border-base shadow flex="~ col gap-1 p1">
        <button
          v-tooltip.left="'Expand All'"
          w-10 h-10 rounded-full hover:bg-active op-fade
          hover:op100 flex="~ items-center justify-center"
          :disabled="isGraphNodeToggling"
          :class="{ 'op50 cursor-not-allowed': isGraphNodeToggling, 'hover:bg-active': !isGraphNodeToggling }"
          title="Expand All"
          @click="expandAll()"
        >
          <div class="i-carbon:expand-categories" />
        </button>
        <button
          v-tooltip.left="'Collapse All'"
          w-10 h-10 rounded-full hover:bg-active op-fade
          hover:op100 flex="~ items-center justify-center"
          :disabled="isGraphNodeToggling"
          :class="{ 'op50 cursor-not-allowed': isGraphNodeToggling, 'hover:bg-active': !isGraphNodeToggling }"
          title="Collapse All"
          @click="collapseAll()"
        >
          <div class="i-carbon:collapse-categories" />
        </button>

        <div border="t base" my1 />

        <button
          v-tooltip.left="'Zoom In (Ctrl + =)'"
          :disabled="scale >= ZOOM_MAX"
          w-10 h-10 rounded-full hover:bg-active op-fade
          hover:op100 disabled:op20 disabled:bg-none
          disabled:cursor-not-allowed
          flex="~ items-center justify-center"
          title="Zoom In (Ctrl + =)"
          @click="zoomIn()"
        >
          <div i-ph-magnifying-glass-plus-duotone />
        </button>
        <button
          v-tooltip.left="'Zoom Out (Ctrl + -)'"
          :disabled="scale <= ZOOM_MIN"
          w-10 h-10 rounded-full hover:bg-active op-fade hover:op100
          disabled:op20 disabled:bg-none disabled:cursor-not-allowed
          flex="~ items-center justify-center"
          title="Zoom Out (Ctrl + -)"
          @click="zoomOut()"
        >
          <div i-ph-magnifying-glass-minus-duotone />
        </button>
      </div>
    </div>
  </div>
</template>
