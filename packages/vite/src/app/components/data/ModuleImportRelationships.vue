<script setup lang="ts">
import type { HierarchyNode } from 'd3-hierarchy'
import type { ModuleImport, ModuleInfo, ModuleListItem, SessionContext } from '~~/shared/types'
import type { ModuleGraphLink, ModuleGraphNode } from '~/composables/moduleGraph'
import { useScroll } from '@vueuse/core'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { generateModuleGraphLink, getModuleGraphLinkColor } from '~/composables/moduleGraph'

const props = defineProps<{
  module: ModuleInfo
  session: SessionContext
}>()

type LinkPoint = 'importer-start' | 'importer-end' | 'import-start' | 'import-end'

const MAX_LINKS = 20
const SPACING = {
  width: 400,
  height: 30,
  padding: 4,
  marginX: 8,
  border: 1,
  margin: 8,
  dot: 16,
  dotOffset: 80,
  linkOffset: 0,
}

const container = useTemplateRef<HTMLDivElement>('container')
const importersContainer = useTemplateRef<HTMLDivElement>('importersContainer')
const links = ref<ModuleGraphLink<ModuleListItem, ModuleImport>[]>([])

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

const normalizedMaxLinks = computed(() => {
  return Math.min(Math.max(props.module.importers?.length || 0, props.module.imports?.length || 0), MAX_LINKS)
})

const { y: importersScrollY } = useScroll(importersContainer)
const importersMaxLength = computed(() => Math.min(importers.value?.length || 0, MAX_LINKS))
const importsMaxLength = computed(() => Math.min(props.module.imports?.length || 0, MAX_LINKS))
const nodesHeight = computed(() => SPACING.height * normalizedMaxLinks.value + SPACING.padding * (normalizedMaxLinks.value + 1) + SPACING.border * 2)
const importersVerticalOffset = computed(() => {
  const diff = Math.max(0, importsMaxLength.value - importersMaxLength.value)
  const offset = (diff * (SPACING.height + SPACING.padding)) / 2
  return Math.min(offset, nodesHeight.value / 2)
})
const importsVerticalOffset = computed(() => {
  const diff = Math.max(0, importersMaxLength.value - importsMaxLength.value)
  const offset = (diff * (SPACING.height + SPACING.padding)) / 2
  return Math.min(offset, nodesHeight.value / 2)
})

const dotNodeMargin = computed(() => `${nodesHeight.value / 2 - SPACING.dot / 2}px ${SPACING.dotOffset}px 0  ${importers.value?.length ? SPACING.dotOffset : 0}px`)
const linkStartX = computed(() => importers.value?.length ? SPACING.width + SPACING.marginX : SPACING.marginX)
const dotStartX = computed(() => importers.value?.length ? linkStartX.value + SPACING.dotOffset : linkStartX.value)
const dotStartY = computed(() => (SPACING.height * normalizedMaxLinks.value + ((normalizedMaxLinks.value + 1) * SPACING.padding)) / 2)

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
      return ((SPACING.height + SPACING.padding) * i!) + (SPACING.height / 2 + SPACING.padding) + importersVerticalOffset.value - importersScrollY.value % (SPACING.height + SPACING.padding)
    case 'import-end':
      return ((SPACING.height + SPACING.padding) * i!) + (SPACING.height / 2 + SPACING.padding) + importsVerticalOffset.value
    case 'importer-end':
    case 'import-start':
      return dotStartY.value
  }
}

function generateLinks() {
  links.value = []

  // importers (left -> current node)
  if (importers.value?.length) {
    const _importersLinks = Array.from({ length: importersMaxLength.value }, (_, i) => {
      return {
        id: `link-importer-${i}`,
        source: {
          x: calculateLinkX('importer-start'),
          y: calculateLinkY('importer-start', i),
        } as HierarchyNode<ModuleGraphNode<ModuleListItem, ModuleImport>>,
        target: {
          x: calculateLinkX('importer-end'),
          y: calculateLinkY('importer-end'),
        } as HierarchyNode<ModuleGraphNode<ModuleListItem, ModuleImport>>,
      }
    })
    links.value.push(..._importersLinks)
  }
  // imports (current node -> right)
  if (props.module?.imports?.length) {
    const _importsLinks = Array.from({ length: importsMaxLength.value }, (_, i) => {
      return {
        id: `link-import-${i}`,
        source: {
          x: calculateLinkX('import-start'),
          y: calculateLinkY('import-start'),
        } as HierarchyNode<ModuleGraphNode<ModuleListItem, ModuleImport>>,
        target: {
          x: calculateLinkX('import-end'),
          y: calculateLinkY('import-end', i),
        } as HierarchyNode<ModuleGraphNode<ModuleListItem, ModuleImport>>,
      }
    })
    links.value.push(..._importsLinks)
  }
}

function updateLinksOffset() {
  for (const [idx, link] of links.value.entries()) {
    if (idx >= (importersMaxLength.value)) {
      continue
    }
    link.source.y = calculateLinkY('importer-start', idx)
  }
}

onMounted(() => {
  watch(
    () => [props.module],
    generateLinks,
    { immediate: true },
  )
  watch(
    () => importersScrollY.value,
    () => {
      updateLinksOffset()
    },
  )
})
</script>

<template>
  <div ref="container" w-full relative select-none mt4>
    <!-- nodes -->
    <div flex px2>
      <!-- importers -->
      <div
        v-if="importers?.length" ref="importersContainer" py1 overflow-y-auto :style="{
          width: `${SPACING.width + SPACING.marginX}px`,
          maxHeight: `${SPACING.height * importersMaxLength + SPACING.padding * (importersMaxLength - 1)}px`,
          marginTop: `${importersVerticalOffset}px`,
        }"
      >
        <template v-for="(importer, i) of importers" :key="importer!.id">
          <DisplayModuleId
            :id="importer!.id" hover="bg-active" block px2 p1 bg-base ws-nowrap z-graph-node
            border="~ base rounded" :link="true" :session="session" :minimal="true" :style="{
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
        bg-base rounded-full border-3 font-mono border-active flex-shrink-0 :style="{
          margin: dotNodeMargin,
          width: `${SPACING.dot}px`,
          height: `${SPACING.dot}px`,
        }"
      />
      <!-- imports -->
      <div
        v-if="module.imports?.length" py1 :style="{
          width: `${SPACING.width}px`,
          marginTop: `${importsVerticalOffset}px`,
        }"
      >
        <template v-for="(_import, i) of module.imports" :key="_import.module_id">
          <DisplayModuleId
            :id="_import!.module_id" hover="bg-active" block px2 p1 bg-base ws-nowrap z-graph-node
            border="~ base rounded" :link="true" :session="session" :minimal="true" :style="{
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
    <svg
      pointer-events-none absolute left-0 top-0 z-graph-link w-full :style="{
        height: `${nodesHeight}px`,
      }"
    >
      <g>
        <path
          v-for="link of links" :key="link.id" :d="generateModuleGraphLink<ModuleListItem, ModuleImport>(link)!"
          :class="getModuleGraphLinkColor<ModuleListItem, ModuleImport>(link)"
          :stroke-dasharray="link.import?.kind === 'dynamic-import' ? '3 6' : undefined" fill="none"
        />
      </g>
    </svg>
  </div>
</template>
