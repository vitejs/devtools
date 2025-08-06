<script setup lang="ts">
import type { Asset as AssetInfo } from '@rolldown/debug'
import type { HierarchyLink, HierarchyNode } from 'd3-hierarchy'
import { linkHorizontal, linkVertical } from 'd3-shape'
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  importers?: AssetInfo[]
  imports?: AssetInfo[]
}>()

interface Node {
  asset: AssetInfo
}

type Link = HierarchyLink<Node> & {
  id: string
}

type LinkPoint = 'importer-start' | 'importer-end' | 'import-start' | 'import-end'

const MAX_LINKS = 20
const SPACING = {
  width: 400,
  height: 35,
  padding: 4,
  marginX: 8,
  border: 1,
  margin: 8,
  dot: 16,
  dotOffset: 80,
}

const container = useTemplateRef<HTMLDivElement>('container')
const links = shallowRef<Link[]>([])

const normalizedMaxLinks = computed(() => {
  return Math.min(Math.max(props.importers?.length || 0, props.imports?.length || 0), MAX_LINKS)
})

const importersMaxLength = computed(() => Math.min(props.importers?.length || 0, MAX_LINKS))
const importsMaxLength = computed(() => Math.min(props.imports?.length || 0, MAX_LINKS))
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

const dotNodeMargin = computed(() => `${nodesHeight.value / 2 - SPACING.dot / 2}px ${SPACING.dotOffset}px 0  ${props.importers?.length ? SPACING.dotOffset : 0}px`)
const linkStartX = computed(() => props.importers?.length ? SPACING.width + SPACING.marginX : SPACING.marginX)
const dotStartX = computed(() => props.importers?.length ? linkStartX.value + SPACING.dotOffset : linkStartX.value)
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
      return props.importers?.length ? linkStartX.value + SPACING.dotOffset * 2 + SPACING.dot : linkStartX.value + SPACING.dotOffset + SPACING.dot
  }
}

function calculateLinkY(type: LinkPoint, i?: number) {
  switch (type) {
    case 'importer-start':
      return ((SPACING.height + SPACING.padding) * i!) + (SPACING.height / 2 + SPACING.padding) + importersVerticalOffset.value
    case 'import-end':
      return ((SPACING.height + SPACING.padding) * i!) + (SPACING.height / 2 + SPACING.padding) + importsVerticalOffset.value
    case 'importer-end':
    case 'import-start':
      return dotStartY.value
  }
}

function generateLinks() {
  links.value = []

  // importers (left -> current asset)
  if (props.importers?.length) {
    const _importersLinks = Array.from({ length: importersMaxLength.value }, (_, i) => {
      return {
        id: `importer-${i}`,
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

  // imports (current asset -> right)
  if (props.imports?.length) {
    const _importsLinks = Array.from({ length: importsMaxLength.value }, (_, i) => {
      return {
        id: `import-${i}`,
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
    () => [props.importers, props.imports],
    generateLinks,
    { immediate: true },
  )
})
</script>

<template>
  <div
    v-if="importers?.length || imports?.length"
    ref="container"
    w-full relative select-none
  >
    <!-- nodes -->
    <div flex px2>
      <!-- importers -->
      <div
        v-if="importers?.length"
        py1
        :style="{
          width: `${SPACING.width}px`,
          marginTop: `${importersVerticalOffset}px`,
        }"
      >
        <template v-for="(importer, i) of importers" :key="importer.filename">
          <NuxtLink
            :to="{ query: { asset: importer.filename } }"
            hover="bg-active" block px2 p1 bg-base
            z-graph-node
            border="~ base rounded"
            font-mono text-sm
            :style="{
              width: `${SPACING.width}px`,
              height: `${SPACING.height}px`,
              overflow: 'hidden',
              marginBottom: `${i === importers!.length - 1 ? 0 : SPACING.padding}px`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }"
          >
            <DisplayFileIcon :filename="importer.filename" />
            <span overflow-hidden text-ellipsis>
              {{ importer.filename }}
            </span>
          </NuxtLink>
        </template>
      </div>

      <!-- dot: current asset -->
      <div
        bg-base rounded-full border-3 font-mono border-active :style="{
          margin: dotNodeMargin,
          width: `${SPACING.dot}px`,
          height: `${SPACING.dot}px`,
        }"
      />

      <!-- imports -->
      <div
        v-if="imports?.length"
        py1
        :style="{
          width: `${SPACING.width}px`,
          marginTop: `${importsVerticalOffset}px`,
        }"
      >
        <template v-for="(_import, i) of imports" :key="_import.filename">
          <NuxtLink
            :to="{ query: { asset: _import.filename } }"
            hover="bg-active" block px2 p1 bg-base
            z-graph-node
            border="~ base rounded"
            font-mono text-sm
            :style="{
              width: `${SPACING.width}px`,
              height: `${SPACING.height}px`,
              overflow: 'hidden',
              marginBottom: `${i === imports!.length - 1 ? 0 : SPACING.padding}px`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }"
          >
            <DisplayFileIcon :filename="_import.filename" />
            <span overflow-hidden text-ellipsis>
              {{ _import.filename }}
            </span>
          </NuxtLink>
        </template>
      </div>
    </div>

    <!-- links -->
    <svg
      pointer-events-none absolute left-0 top-0 z-graph-link w-full
      :style="{
        height: `${nodesHeight}px`,
      }"
    >
      <g>
        <path
          v-for="link of links"
          :key="link.id"
          :d="generateLink(link)!"
          :class="getLinkColor(link)"
          fill="none"
        />
      </g>
    </svg>
  </div>
</template>
