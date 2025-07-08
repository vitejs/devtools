<script setup lang="ts">
import type { HierarchyLink, HierarchyNode } from 'd3-hierarchy'
import type { ModuleImport, ModuleInfo, ModuleListItem, SessionContext } from '~~/shared/types'
import { hierarchy, tree } from 'd3-hierarchy'
import { linkHorizontal, linkVertical } from 'd3-shape'
import { computed, nextTick, onMounted, ref, shallowReactive, shallowRef, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  module: ModuleInfo
  session: SessionContext
}>()

interface Node {
  module: ModuleListItem
  import?: ModuleImport
}

type Link = HierarchyLink<Node> & {
  id: string
  import?: ModuleImport
}

const SPACING = {
  width: 400,
  height: 55,
  linkOffset: 20,
  margin: 300,
  gap: 60,
}

const container = useTemplateRef<HTMLDivElement>('container')
const width = ref(window.innerWidth)
const height = ref(window.innerHeight)
const nodes = shallowRef<HierarchyNode<Node>[]>([])
const links = shallowRef<Link[]>([])
const nodesRefMap = shallowReactive(new Map<string, HTMLDivElement>())

const modulesMap = computed(() => {
  const map = new Map<string, ModuleListItem>()
  for (const module of props.session.modulesList) {
    map.set(module.id, module)
  }
  return map
})

const createLinkHorizontal = linkHorizontal()
  .x(d => d[0])
  .y(d => d[1])

const createLinkVertical = linkVertical()
  .x(d => d[0])
  .y(d => d[1])

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

function calculateGraph() {
  // Unset the canvas size, and recalculate again after nodes are rendered
  width.value = window.innerWidth
  height.value = window.innerHeight
  const seen = new Set<ModuleListItem>()

  // build imports graph
  const importsRoot = hierarchy<Node>(
    { module: { id: '~root' } } as any,
    (parent) => {
      if (parent.module.id === '~root') {
        const module = modulesMap.value.get(props.module.id)!
        return [{ module }]
      }
      else if (parent.module.id === props.module.id) {
        const modules = parent.module.imports
          .map((x): Node | undefined => {
            const module = modulesMap.value.get(x.module_id)!
            if (!module)
              return undefined
            if (seen.has(module))
              return undefined

            seen.add(module)
            return {
              module,
            }
          })
          .filter(x => x !== undefined)
        return [...modules]
      }
    },
  )

  const layout = tree<Node>()
    .nodeSize([SPACING.height, SPACING.width + SPACING.gap])
  layout(importsRoot)

  // Rotate the graph from top-down to left-right
  const _importsNodes = importsRoot.descendants()
  for (const node of _importsNodes) {
    [node.x, node.y] = [node.y! - SPACING.width, node.x!]
  }

  // Offset the graph and adding margin
  const minX = Math.min(..._importsNodes.map(n => n.x!))
  const minY = Math.min(..._importsNodes.map(n => n.y!))
  if (minX < SPACING.margin) {
    for (const node of _importsNodes) {
      node.x! += Math.abs(minX) + SPACING.margin
    }
  }
  if (minY < SPACING.margin) {
    for (const node of _importsNodes) {
      node.y! += Math.abs(minY) + SPACING.margin
    }
  }

  const _importsLinks = importsRoot.links()
    .filter(x => x.source.data.module.id !== '~root')
    .map((x): Link => {
      return {
        ...x,
        import: x.source.data.import,
        id: `${x.source.data.module.id}|${x.target.data.module.id}`,
      }
    })

  // build importers graph
  const importersRoot = hierarchy<Node>(
    { module: { id: '~root' } } as any,
    (parent) => {
      if (parent.module.id === '~root') {
        const module = modulesMap.value.get(props.module.id)!
        if (seen.has(module))
          return undefined
        seen.add(module)
        return [{ module }]
      }
      else if (parent.module.id === props.module.id) {
        const modules = parent.module.importers
          .map((x): Node | undefined => {
            const module = modulesMap.value.get(x)!
            if (!module)
              return undefined
            if (seen.has(module))
              return undefined

            seen.add(module)
            return {
              module,
            }
          })
          .filter(x => x !== undefined)
        return modules
      }
    },
  )

  layout(importersRoot)

  const _importersNodes = importersRoot.descendants()
  for (const node of _importersNodes) {
    if (props.module.importers?.includes(node.data.module.id)) {
      [node.x, node.y] = [-(SPACING.width + SPACING.gap), node.x!]
    }
    else {
      [node.x, node.y] = [node.y! - SPACING.width, node.x!]
    }
  }

  const rootNode = _importsNodes.find(n => n.data.module.id === props.module.id)!
  _importersNodes.forEach((n) => {
    if (n.data.module.id === props.module.id) {
      n.x = rootNode!.x
      n.y = rootNode!.y
    }
    else {
      n.x = rootNode.x! + n.x!
      n.y = rootNode.y! + n.y!
    }
  })

  const _importersLinks = importersRoot.links()
    .filter(x => x.source.data.module.id !== '~root')
    .map((x): Link => {
      return {
        ...x,
        source: {
          ...x.source,
          x: x.source.x! - (SPACING.width) + SPACING.linkOffset,
          y: x.source.y!,
        } as HierarchyNode<Node>,
        target: {
          ...x.target,
          x: x.target.x! + SPACING.width - SPACING.linkOffset,
        } as HierarchyNode<Node>,
        import: x.source.data.import,
        id: `${x.source.data.module.id}|${x.target.data.module.id}`,
      }
    })

  // deduplicate modules
  nodes.value = [..._importsNodes, ..._importersNodes].filter((n, i, s) =>
    i === s.findIndex(t => t.data.module.id === n.data.module.id),
  )
  links.value = [..._importsLinks, ..._importersLinks]

  nextTick(() => {
    width.value = (container.value!.scrollWidth + SPACING.margin)
    height.value = (container.value!.scrollHeight + SPACING.margin)
    focusOn(props.module.id, false)
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

onMounted(() => {
  watch(
    () => [props.module],
    calculateGraph,
    { immediate: true },
  )
})
</script>

<template>
  <div
    ref="container"
    w-full min-h-full relative select-none of-auto
  >
    <div
      flex="~ items-center justify-center"
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
            absolute hover="bg-active" block px2 p1 bg-glass
            z-graph-node
            border="~ base rounded"
            :link="true"
            :session="session"
            :pkg="node.data.module"
            :minimal="true"
            :style="{
              left: `${node.x}px`,
              top: `${node.y}px`,
              minWidth: `${SPACING.width}px`,
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
</template>
