<script setup lang="ts">
import type { HierarchyLink, HierarchyNode } from 'd3-hierarchy'
import type { ModuleImport, ModuleListItem, SessionContext } from '~~/shared/types'
import { useEventListener } from '@vueuse/core'
import { hierarchy, tree } from 'd3-hierarchy'
import { linkHorizontal, linkVertical } from 'd3-shape'
import { computed, nextTick, onMounted, reactive, ref, shallowReactive, shallowRef, useTemplateRef, watch } from 'vue'

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
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const nodesRefMap = shallowReactive(new Map<string, HTMLDivElement>())

const nodes = shallowRef<HierarchyNode<Node>[]>([])
const links = shallowRef<Link[]>([])
const nodesMap = shallowReactive(new Map<string, HierarchyNode<Node>>())
const linksMap = shallowReactive(new Map<string, Link>())

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
          const module = modulesMap.value.get(x.id)
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
    focusOn(rootModules.value[0].id, false)
  })
}

function zoomGraph(zoomIn: boolean) {
  const rect = container.value!.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2

  const graphCenterX = (centerX - translateX.value) / scale.value
  const graphCenterY = (centerY - translateY.value) / scale.value

  const oldScale = scale.value
  const scaleFactor = zoomIn ? 1.5 : 0.5
  const newScale = Math.max(0.1, Math.min(3, oldScale * scaleFactor))

  const newTranslateX = centerX - graphCenterX * newScale
  const newTranslateY = centerY - graphCenterY * newScale

  scale.value = newScale
  translateX.value = newTranslateX
  translateY.value = newTranslateY
}

function setupViewportControls() {
  let startX = 0
  let startY = 0
  let startTranslateX = 0
  let startTranslateY = 0

  useEventListener(container, 'mousedown', (e) => {
    if ((e.target as HTMLElement).closest('[data-module-node]')) {
      return
    }

    isGrabbing.value = true
    startX = e.clientX
    startY = e.clientY
    startTranslateX = translateX.value
    startTranslateY = translateY.value
    e.preventDefault()
  })

  useEventListener('mouseleave', () => isGrabbing.value = false)
  useEventListener('mouseup', () => isGrabbing.value = false)

  useEventListener('mousemove', (e) => {
    if (!isGrabbing.value)
      return

    e.preventDefault()
    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    translateX.value = startTranslateX + deltaX
    translateY.value = startTranslateY + deltaY
  })

  useEventListener(container, 'wheel', (e) => {
    e.preventDefault()
    zoomGraph(e.deltaY < 0)
  })

  useEventListener('keydown', (e) => {
    if ((e.altKey || e.metaKey)) {
      if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        zoomGraph(true)
      }
      else if (e.key === '-') {
        e.preventDefault()
        zoomGraph(false)
      }
    }
  })
}

function focusOn(id: string, animated = true) {
  const node = nodesMap.get(id)
  if (!node)
    return

  const containerRect = container.value!.getBoundingClientRect()
  const targetX = containerRect.width / 2 - node.x! * scale.value
  const targetY = containerRect.height / 2 - node.y! * scale.value

  if (animated) {
    const startX = translateX.value
    const startY = translateY.value
    const duration = 500
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - (1 - progress) ** 3 // easeOutCubic

      translateX.value = startX + (targetX - startX) * eased
      translateY.value = startY + (targetY - startY) * eased

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    animate()
  }
  else {
    translateX.value = targetX
    translateY.value = targetY
  }
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

onMounted(() => {
  setupViewportControls()

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
    w-full h-screen overflow-hidden relative select-none
    :class="isGrabbing ? 'cursor-grabbing' : ''"
  >
    <div
      absolute left-0 top-0 w-full h-full
      class="bg-dots"
      :style="{
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        transformOrigin: '0 0',
      }"
    />

    <div
      absolute left-0 top-0
      :style="{
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        transformOrigin: '0 0',
      }"
    >
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
          <DisplayModuleId
            :id="node.data.module.id"
            :ref="(el: any) => nodesRefMap.set(node.data.module.id, el?.$el)"
            data-module-node
            absolute hover="bg-active" block px2 p1 bg-glass z-graph-node
            border="~ base rounded"
            :link="true"
            :session="session"
            :pkg="node.data.module"
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

    <div absolute top-4 right-4 px-3 py-1 bg-glass border="~ base rounded" text-sm op-75>
      {{ Math.round(scale * 100) }}%
    </div>

    <div absolute bottom-4 right-4 flex flex-col gap-2>
      <button
        p2 op-fade hover:op100
        flex="~ items-center justify-center"
        rounded border border-base op80
        @click="zoomGraph(true)"
      >
        <span class="i-carbon-add text-lg" />
      </button>
      <button
        p2 op-fade hover:op100
        flex="~ items-center justify-center"
        rounded border border-base
        exact-active-class="text-primary op100!"
        @click="zoomGraph(false)"
      >
        <span class="i-carbon-subtract text-lg" />
      </button>
    </div>
  </div>
</template>
