<script setup lang="ts">
import type { HierarchyLink, HierarchyNode } from 'd3-hierarchy'
import type { ModuleImport, ModuleListItem, SessionContext } from '~~/shared/types'
import { onKeyPressed, useEventListener, useMagicKeys } from '@vueuse/core'
import { hierarchy, tree } from 'd3-hierarchy'
import { linkHorizontal, linkVertical } from 'd3-shape'
import { computed, nextTick, onMounted, reactive, ref, shallowReactive, shallowRef, useTemplateRef, watch } from 'vue'
import { useZoomElement } from '~/composables/zoomElement'

const props = defineProps<{
  session: SessionContext
  modules: ModuleListItem[]
}>()

interface Node {
  module: ModuleListItem
  import?: ModuleImport
  expanded?: boolean
  hasChildren: boolean
}

type Link = HierarchyLink<Node> & {
  id: string
  import?: ModuleImport
}

const graphRender = ref<'normal' | 'mini'>('normal')

const SPACING = reactive({
  width: computed(() => graphRender.value === 'normal' ? 400 : 10),
  height: computed(() => graphRender.value === 'normal' ? 55 : 20),
  linkOffset: computed(() => graphRender.value === 'normal' ? 20 : 0),
  margin: computed(() => 800),
  gap: computed(() => graphRender.value === 'normal' ? 150 : 100),
})

const container = useTemplateRef<HTMLDivElement>('container')
const isGrabbing = ref(false)
const width = ref(window.innerWidth)
const height = ref(window.innerHeight)
const nodesRefMap = shallowReactive(new Map<string, HTMLDivElement>())

const collapsedNodes = shallowReactive(new Set<string>())
const isUpdating = ref(false)
const lastActionNodeId = ref<string | null>(null)
const childToParentMap = shallowReactive(new Map<string, string>())
const isFirstCalculateGraph = ref(true)

const nodes = shallowRef<HierarchyNode<Node>[]>([])
const links = shallowRef<Link[]>([])
const nodesMap = shallowReactive(new Map<string, HierarchyNode<Node>>())
const linksMap = shallowReactive(new Map<string, Link>())

const ZOOM_MIN = 0.4
const ZOOM_MAX = 2
const { control } = useMagicKeys()
const { scale, zoomIn, zoomOut } = useZoomElement(container, {
  wheel: control,
  minScale: ZOOM_MIN,
  maxScale: ZOOM_MAX,
})

onKeyPressed(['-', '_'], (e) => {
  if (e.ctrlKey)
    zoomOut()
})

onKeyPressed(['=', '+'], (e) => {
  if (e.ctrlKey)
    zoomIn()
})

const modulesMap = computed(() => {
  const map = new Map<string, ModuleListItem>()
  for (const module of props.modules) {
    map.set(module.id, module)
  }
  return map
})

const rootModules = computed(() => {
  return props.modules.filter(x => x.importers.length === 0)
})

const createLinkHorizontal = linkHorizontal()
  .x(d => d[0])
  .y(d => d[1])

const createLinkVertical = linkVertical()
  .x(d => d[0])
  .y(d => d[1])

function calculateGraph() {
  // Unset the canvas size, and recalculate again after nodes are rendered
  width.value = window.innerWidth
  height.value = window.innerHeight

  const seen = new Set<ModuleListItem>()
  const root = hierarchy<Node>(
    { module: { id: '~root' } } as any,
    (parent) => {
      if (parent.module.id === '~root') {
        rootModules.value.forEach((x) => {
          seen.add(x)

          if (isFirstCalculateGraph.value) {
            childToParentMap.set(x.id, '~root')
          }
        })
        return rootModules.value.map(x => ({
          module: x,
          expanded: !collapsedNodes.has(x.id), // 简化：未折叠即为展开
          hasChildren: false,
        }))
      }

      if (collapsedNodes.has(parent.module.id)) {
        return []
      }

      const modules = parent.module.imports
        .map((x): Node | undefined => {
          const module = modulesMap.value.get(x.module_id)
          if (!module)
            return undefined
          if (seen.has(module))
            return undefined

          // Check if the module is a child of the current parent
          if (childToParentMap.has(module.id) && childToParentMap.get(module.id) !== parent.module.id)
            return undefined

          seen.add(module)

          if (isFirstCalculateGraph.value) {
            childToParentMap.set(module.id, parent.module.id)
          }

          return {
            module,
            import: x,
            expanded: !collapsedNodes.has(module.id),
            hasChildren: false,
          }
        })
        .filter(x => x !== undefined)

      return modules
    },
  )

  if (isFirstCalculateGraph.value) {
    isFirstCalculateGraph.value = false
  }

  // Calculate the layout
  const layout = tree<Node>()
    .nodeSize([SPACING.height, SPACING.width + SPACING.gap])
  layout(root)

  const _nodes = root.descendants()

  for (const node of _nodes) {
    // Rotate the graph from top-down to left-right
    [node.x, node.y] = [node.y! - SPACING.width, node.x!]

    if (node.data.module.imports) {
      node.data.hasChildren = node.data.module.imports
        ?.filter(subNode => childToParentMap.get(subNode.module_id) === node.data.module.id)
        .length > 0
    }
  }

  // Offset the graph and adding margin
  const minX = Math.min(..._nodes.map(n => n.x!))
  const minY = Math.min(..._nodes.map(n => n.y!))
  if (minX < SPACING.margin) {
    for (const node of _nodes) {
      node.x! += Math.abs(minX) + SPACING.margin
    }
  }
  if (minY < SPACING.margin) {
    for (const node of _nodes) {
      node.y! += Math.abs(minY) + SPACING.margin
    }
  }

  nodes.value = _nodes
  nodesMap.clear()
  for (const node of _nodes) {
    nodesMap.set(node.data.module.id, node)
  }
  const _links = root.links()
    .filter(x => x.source.data.module.id !== '~root')
    .map((x): Link => {
      return {
        ...x,
        import: x.source.data.import,
        id: `${x.source.data.module.id}|${x.target.data.module.id}`,
      }
    })
  linksMap.clear()
  for (const link of _links) {
    linksMap.set(link.id, link)
  }
  links.value = _links

  nextTick(() => {
    width.value = (container.value!.scrollWidth / scale.value + SPACING.margin)
    height.value = (container.value!.scrollHeight / scale.value + SPACING.margin)
    const moduleId = rootModules.value?.[0]?.id
    if (!lastActionNodeId.value && moduleId) {
      nextTick(() => {
        focusOn(moduleId, false)
      })
    }
  })
}

function focusOn(id: string, animated = true) {
  const el = nodesRefMap.get(id)
  el?.scrollIntoView({
    block: 'center',
    inline: 'center',
    behavior: animated ? 'smooth' : 'instant',
  })
}

function adjustScrollPositionAfterToggle(id: string, beforePosition: { x: number, y: number }) {
  // Ensure this runs after the nextTick inside calculateGraph completes (width and height are computed)
  nextTick(() => {
    nextTick(() => {
      const newNode = nodesRefMap.get(id)

      if (newNode && beforePosition && container.value) {
        const containerRect = container.value.getBoundingClientRect()
        const newRect = newNode.getBoundingClientRect()

        const viewportDiffX = newRect.left - containerRect.left - beforePosition.x
        const viewportDiffY = newRect.top - containerRect.top - beforePosition.y

        container.value.scrollLeft += viewportDiffX
        container.value.scrollTop += viewportDiffY
      }
    })
  })
}

function toggleNode(id: string) {
  if (isUpdating.value)
    return

  isUpdating.value = true
  lastActionNodeId.value = id

  const node = nodesRefMap.get(id)
  let beforePosition: null | { x: number, y: number } = null

  // Record position relative to the scroll container to avoid drift after reflow
  if (node && container.value) {
    const containerRect = container.value.getBoundingClientRect()
    const rect = node.getBoundingClientRect()
    beforePosition = {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
    }
  }

  if (collapsedNodes.has(id)) {
    collapsedNodes.delete(id)
  }
  else {
    collapsedNodes.add(id)
  }

  calculateGraph()

  // Adjust scroll position after layout changes
  if (beforePosition) {
    adjustScrollPositionAfterToggle(id, beforePosition)
  }

  isUpdating.value = false
  lastActionNodeId.value = null
}

function expandAll() {
  if (isUpdating.value)
    return

  isUpdating.value = true

  collapsedNodes.clear()
  calculateGraph()

  setTimeout(() => {
    isUpdating.value = false
  }, 300)
}

function collapseAll() {
  if (isUpdating.value)
    return

  isUpdating.value = true

  props.modules.forEach((module) => {
    if (module.imports.length > 0) {
      collapsedNodes.add(module.id)
    }
  })
  calculateGraph()

  setTimeout(() => {
    isUpdating.value = false
  }, 300)
}

function generateLink(link: Link) {
  if (link.target.x! <= link.source.x!) {
    return createLinkVertical({
      source: [link.source.x! + SPACING.width / 2 - SPACING.linkOffset, link.source.y!],
      target: [link.target.x! - SPACING.width / 2 + SPACING.linkOffset, link.target.y!],
    })
  }
  return createLinkHorizontal({
    source: [link.source.x! + SPACING.width / 2 - SPACING.linkOffset, link.source.y!],
    target: [link.target.x! - SPACING.width / 2 + SPACING.linkOffset, link.target.y!],
  })
}

function getLinkColor(_link: Link) {
  return 'stroke-#8885'
}

function handleDraggingScroll() {
  let x = 0
  let y = 0
  const SCROLLBAR_THICKNESS = 20

  useEventListener(container, 'mousedown', (e) => {
    // prevent dragging when clicking on scrollbar
    const rect = container.value!.getBoundingClientRect()
    const distRight = rect.right - e.clientX
    const distBottom = rect.bottom - e.clientY

    if (distRight <= SCROLLBAR_THICKNESS || distBottom <= SCROLLBAR_THICKNESS) {
      return
    }

    isGrabbing.value = true
    x = container.value!.scrollLeft + e.pageX
    y = container.value!.scrollTop + e.pageY
  })
  useEventListener(container, 'contextmenu', e => e.preventDefault())
  useEventListener('mouseleave', () => isGrabbing.value = false)
  useEventListener('mouseup', () => isGrabbing.value = false)
  useEventListener('mousemove', (e) => {
    if (!isGrabbing.value)
      return
    e.preventDefault()
    container.value!.scrollLeft = x - e.pageX
    container.value!.scrollTop = y - e.pageY
  })
}

onMounted(() => {
  handleDraggingScroll()

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

  watch(
    () => graphRender.value,
    calculateGraph,
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
      <!-- Make this <div> in order to expand the scroll bar -->
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
            <path
              v-for="link of links"
              :key="link.id"
              :d="generateLink(link)!"
              :class="getLinkColor(link)"
              :stroke-dasharray="link.import?.kind === 'dynamic-import' ? '3 6' : undefined"
              fill="none"
            />
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
                  minWidth: graphRender === 'normal' ? `${SPACING.width}px` : undefined,
                  maxWidth: '400px',
                  maxHeight: '50px',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                }"
              >
                <DisplayModuleId
                  :id="node.data.module.id"
                  :ref="(el: any) => nodesRefMap.set(node.data.module.id, el?.$el)"
                  :link="true"
                  :session="session"
                  :minimal="true"
                  flex="1"
                />
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
                  :disabled="isUpdating"
                  :class="{ 'cursor-not-allowed': isUpdating, 'hover:bg-active': !isUpdating }"
                  :title="node.data.expanded ? 'Collapse' : 'Expand'"
                  @click.stop="toggleNode(node.data.module.id)"
                >
                  <div
                    class="text-primary"
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
          :disabled="isUpdating"
          :class="{ 'op50 cursor-not-allowed': isUpdating, 'hover:bg-active': !isUpdating }"
          title="Expand All"
          @click="expandAll()"
        >
          <div class="i-carbon:expand-categories" />
        </button>
        <button
          v-tooltip.left="'Collapse All'"
          w-10 h-10 rounded-full hover:bg-active op-fade
          hover:op100 flex="~ items-center justify-center"
          :disabled="isUpdating"
          :class="{ 'op50 cursor-not-allowed': isUpdating, 'hover:bg-active': !isUpdating }"
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
