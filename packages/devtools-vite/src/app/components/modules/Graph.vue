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
        rootModules.value.forEach(x => seen.add(x))
        return rootModules.value.map(x => ({ module: x }))
      }
      const modules = parent.module.imports
        .map((x): Node | undefined => {
          const module = modulesMap.value.get(x.module_id)
          if (!module)
            return undefined
          if (seen.has(module))
            return undefined

          seen.add(module)
          return {
            module,
            import: x,
          }
        })
        .filter(x => x !== undefined)
      return modules
    },
  )

  // Calculate the layout
  const layout = tree<Node>()
    .nodeSize([SPACING.height, SPACING.width + SPACING.gap])
  layout(root)

  // Rotate the graph from top-down to left-right
  const _nodes = root.descendants()
  for (const node of _nodes) {
    [node.x, node.y] = [node.y! - SPACING.width, node.x!]
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
    if (moduleId) {
      focusOn(moduleId, false)
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
  return 'stroke-#8882'
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
    () => [props.modules, graphRender.value],
    calculateGraph,
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
        <!-- <svg pointer-events-none absolute left-0 top-0 z-graph-link-active :width="width" :height="height">
      <g>
        <path
          v-for="link of links"
          :key="link.id"
          :d="generateLink(link)!"
          fill="none"
          class="stroke-primary:75"
        />
      </g>
    </svg> -->
        <template
          v-for="node of nodes"
          :key="node.data.module.id"
        >
          <template v-if="node.data.module.id !== '~root'">
            <DisplayModuleId
              :id="node.data.module.id"
              :ref="(el: any) => nodesRefMap.set(node.data.module.id, el?.$el)"
              absolute hover="bg-active" block px2 p1 bg-glass z-graph-node
              border="~ base rounded"
              :link="true"
              :session="session"
              :minimal="true"
              :style="{
                left: `${node.x}px`,
                top: `${node.y}px`,
                minWidth: graphRender === 'normal' ? `${SPACING.width}px` : undefined,
                transform: 'translate(-50%, -50%)',
                maxWidth: '400px',
                maxHeight: '50px',
                overflow: 'hidden',
              }"
            />
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

      <div bg-glass rounded-full border border-base shadow>
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
