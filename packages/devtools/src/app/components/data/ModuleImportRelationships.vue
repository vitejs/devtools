<script setup lang="ts">
import type { HierarchyLink, HierarchyNode } from 'd3-hierarchy'
import type { ModuleImport, ModuleInfo, ModuleListItem, SessionContext } from '~~/shared/types'
import { linkHorizontal, linkVertical } from 'd3-shape'
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

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

type LinkPoint = 'importer-start' | 'importer-end' | 'import-start' | 'import-end'

const MAX_NODES = 5
const SPACING = {
  width: 400,
  height: 50,
  padding: 4,
  offsetX: 8,
  border: 1,
  margin: 8,
  dot: 16,
  dotOffset: 80,
}

const container = useTemplateRef<HTMLDivElement>('container')
const links = shallowRef<Link[]>([])

const modulesMap = computed(() => {
  const map = new Map<string, ModuleListItem>()
  for (const module of props.session.modulesList) {
    map.set(module.id, module)
  }
  return map
})

const importers = computed(() => {
  return props.module.importers?.map(x => modulesMap.value.get(x))
})

const maxNodes = computed(() => {
  return Math.min(Math.max(props.module.importers?.length || 0, props.module.imports?.length || 0), MAX_NODES)
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
      source: [link.source.x!, link.source.y!],
      target: [link.target.x!, link.target.y!],
    })
  }
  return createLinkHorizontal({
    source: [link.source.x!, link.source.y!],
    target: [link.target.x!, link.target.y!],
  })
}

function getLinkColor(_link: Link) {
  return 'stroke-#8882'
}

const nodeContainerWidth = SPACING.width + SPACING.padding * 2 + SPACING.border * 2
const nodeContainerHeight = computed(() => SPACING.height * maxNodes.value + SPACING.padding * (maxNodes.value + 1) + SPACING.border * 2)
const dotNodeMargin = computed(() => `${nodeContainerHeight.value / 2 - SPACING.dot / 2}px ${SPACING.dotOffset}px 0  ${importers.value?.length ? SPACING.dotOffset : 0}px`)
const linkStartX = computed(() => importers.value?.length ? nodeContainerWidth + SPACING.offsetX : SPACING.offsetX)
const dotStartX = computed(() => importers.value?.length ? linkStartX.value + SPACING.dotOffset : linkStartX.value)
const dotStartY = computed(() => (SPACING.height * maxNodes.value + ((maxNodes.value + 1) * SPACING.padding)) / 2)

function calculateLinkX(type: LinkPoint) {
  switch (type) {
    case 'importer-start':
      return linkStartX.value
    case 'importer-end':
      return dotStartX.value
    case 'import-start':
      return dotStartX.value + SPACING.dot
    case 'import-end':
      return importers.value?.length ? linkStartX.value + SPACING.dotOffset * 2 + SPACING.dot : linkStartX.value + SPACING.dotOffset + SPACING.dot
  }
}
function calculateLinkY(type: LinkPoint, i?: number) {
  switch (type) {
    case 'importer-start':
    case 'import-end':
      return ((SPACING.height + SPACING.padding) * i!) + (SPACING.height / 2 + SPACING.padding)
    case 'importer-end':
    case 'import-start':
      return dotStartY.value
  }
}

function generateLinks() {
  links.value = []

  // importers (left -> current node)
  if (importers.value?.length) {
    const _importersLinks = Array.from({ length: Math.min(importers.value.length, maxNodes.value) }, (_, i) => {
      return {
        id: '',
        source: {
          x: calculateLinkX('importer-start'),
          y: calculateLinkY('importer-start', i),
        } as HierarchyNode<Node>,
        target: {
          x: calculateLinkX('importer-end'),
          y: calculateLinkY('importer-end'),
        } as HierarchyNode<Node>,
      }
    })
    links.value.push(..._importersLinks)
  }
  // imports (current node -> right)
  if (props.module?.imports?.length) {
    const _importsLinks = Array.from({ length: Math.min(props.module.imports.length, maxNodes.value) }, (_, i) => {
      return {
        id: '',
        source: {
          x: calculateLinkX('import-start'),
          y: calculateLinkY('import-start'),
        } as HierarchyNode<Node>,
        target: {
          x: calculateLinkX('import-end'),
          y: calculateLinkY('import-end', i),
        } as HierarchyNode<Node>,
      }
    })
    links.value.push(..._importsLinks)
  }
}

onMounted(() => {
  watch(
    () => [props.module],
    generateLinks,
    { immediate: true },
  )
})
</script>

<template>
  <div
    ref="container"
    w-full relative select-none
  >
    <!-- nodes -->
    <div flex px2>
      <!-- importers -->
      <div
        v-if="importers?.length"
        border="~ base rounded" px2 py1
        :style="{
          overflow: 'auto',
          width: `${nodeContainerWidth}px`,
          height: `${nodeContainerHeight}px`,
          padding: `${SPACING.padding}px`,
        }"
      >
        <template v-for="(importer, i) of importers" :key="importer.id">
          <DisplayModuleId
            :id="importer!.id"
            hover="bg-active" block px2 p1 bg-glass
            z-graph-node
            border="~ base rounded"
            :link="true"
            :session="session"
            :minimal="true"
            :style="{
              width: `${SPACING.width}px`,
              height: `${SPACING.height}px`,
              overflow: 'hidden',
              marginBottom: `${i === importers!.length - 1 ? 0 : SPACING.padding}px`,
            }"
          />
        </template>
      </div>
      <!-- dot: current module -->
      <div
        bg-base rounded-full border-3 font-mono border-active :style="{
          margin: dotNodeMargin,
          width: `${SPACING.dot}px`,
          height: `${SPACING.dot}px`,
        }"
      />
      <!-- imports -->
      <div
        v-if="module.imports?.length"
        border="~ base rounded" px2 py1
        :style="{
          overflow: 'auto',
          width: `${nodeContainerWidth}px`,
          height: `${nodeContainerHeight}px`,
          padding: `${SPACING.padding}px`,
        }"
      >
        <template v-for="(_import, i) of module.imports" :key="_import.id">
          <DisplayModuleId
            :id="_import!.module_id"
            hover="bg-active" block px2 p1 bg-glass
            z-graph-node
            border="~ base rounded"
            :link="true"
            :session="session"
            :minimal="true"
            :style="{
              width: `${SPACING.width}px`,
              height: `${SPACING.height}px`,
              overflow: 'hidden',
              marginBottom: `${i === module.imports!.length - 1 ? 0 : SPACING.padding}px`,
            }"
          />
        </template>
      </div>
    </div>

    <!-- links -->
    <svg pointer-events-none absolute left-0 top-0 z-graph-link w-full h-180>
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
  </div>
</template>
