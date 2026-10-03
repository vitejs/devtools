<script setup lang="ts">
import type { ViteFlowNode } from './NodeModuleInfo.vue'
import type { ViteModuleListItem } from '~/types/modules'
import { Menu as VMenu } from 'floating-vue'
import { computed } from 'vue'
import { settingsRefs } from '~/state/settings'

interface FlowTransform {
  name: string
  result?: string | null
  start: number
  end: number
  order?: string
  error?: {
    message: string
  }
}

type ViteNoChanges = Extract<ViteFlowNode, { type: 'no_changes_collapsed' }>
type ViteNoChangesHide = Extract<ViteFlowNode, { type: 'no_changes_hide' }>
type ViteLoadNode = Extract<ViteFlowNode, { type: 'load' }>
type ViteTransformNode = Extract<ViteFlowNode, { type: 'transform' }>

const props = defineProps<{
  module: ViteModuleListItem
  modules: ViteModuleListItem[]
  root: string
  transforms: FlowTransform[]
  selected: ViteFlowNode | null
  resolvedId?: string
  transformsLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', value: ViteFlowNode | null): void
}>()

const {
  flowShowAllTransforms,
  flowShowAllLoads,
  flowExpandTransforms,
  flowExpandLoads,
  flowExpandResolveId,
} = settingsRefs

const modulesMap = computed(() => new Map(props.modules.map(module => [module.id, module])))

const firstLoad = computed(() => {
  const first = props.transforms[0]
  if (!first || first.name === '__load__')
    return null
  return first
})

const initialContent = computed(() => props.transforms[0]?.result ?? null)

const resolveIds = computed(() => {
  const resolvePlugins = props.module.plugins.filter(plugin => plugin.resolveId != null)

  if (!resolvePlugins.length && props.resolvedId && props.resolvedId !== props.module.id) {
    return [{
      type: 'resolve',
      id: `resolve:${props.module.id}`,
      plugin_name: 'vite:resolve',
      duration: 0,
      importer: props.resolvedId,
      module_request: props.module.id,
      resolved_id: props.resolvedId,
    }] satisfies ViteFlowNode[]
  }

  return resolvePlugins.map((plugin, index) => ({
    type: 'resolve',
    id: `resolve:${index}:${plugin.name}:${props.module.id}`,
    plugin_name: plugin.name,
    duration: plugin.resolveId ?? 0,
    importer: props.resolvedId,
    module_request: props.module.id,
    resolved_id: props.resolvedId,
  })) satisfies ViteFlowNode[]
})

const loadNodes = computed<ViteLoadNode[]>(() => {
  const load = firstLoad.value
  if (!load)
    return []
  return [{
    type: 'load',
    id: `load:${load.name}:${load.start}:${load.end}`,
    plugin_name: load.name,
    duration: Math.max(0, load.end - load.start),
    content: load.result,
  }]
})

const transformNodes = computed<ViteTransformNode[]>(() => {
  const rawTransforms = props.transforms.slice(1)
  let previousContent = initialContent.value

  return rawTransforms.map((transform, index) => {
    const contentFrom = previousContent
    const contentTo = transform.result ?? previousContent
    previousContent = contentTo
    const diff = countLineDiff(contentFrom, contentTo)

    return {
      type: 'transform',
      id: `transform:${index}:${transform.name}:${transform.start}:${transform.end}`,
      plugin_name: transform.name,
      duration: Math.max(0, transform.end - transform.start),
      content_from: contentFrom,
      content_to: contentTo,
      diff_added: diff.added,
      diff_removed: diff.removed,
    }
  })
})

const transforms = computed((): (ViteNoChanges | ViteNoChangesHide | ViteTransformNode)[] => {
  const unchanged = transformNodes.value.filter(t => t.content_from === t.content_to)
  const changed = transformNodes.value.filter(t => t.content_from !== t.content_to)

  if (flowShowAllTransforms.value && !unchanged.length)
    return transformNodes.value

  if (flowShowAllTransforms.value && unchanged.length) {
    return [
      ...transformNodes.value,
      {
        type: 'no_changes_hide',
        id: 'no_changes_hide',
        count: unchanged.length,
        duration: unchanged.reduce((acc, t) => acc + t.duration, 0),
      } satisfies ViteNoChangesHide,
    ]
  }

  if (!unchanged.length)
    return changed

  return [
    {
      type: 'no_changes_collapsed',
      id: 'no_changes_collapsed',
      count: unchanged.length,
      duration: unchanged.reduce((acc, t) => acc + t.duration, 0),
    } satisfies ViteNoChanges,
    ...changed,
  ]
})

const loads = computed((): (ViteNoChanges | ViteNoChangesHide | ViteLoadNode)[] => {
  const unchanged = loadNodes.value.filter(l => !l.content)
  const changed = loadNodes.value.filter(l => l.content)

  if (flowShowAllLoads.value && !unchanged.length)
    return loadNodes.value

  if (flowShowAllLoads.value && unchanged.length) {
    return [
      ...loadNodes.value,
      {
        type: 'no_changes_hide',
        id: 'no_changes_hide_load',
        count: unchanged.length,
        duration: unchanged.reduce((acc, t) => acc + t.duration, 0),
      } satisfies ViteNoChangesHide,
    ]
  }

  if (!unchanged.length)
    return changed

  return [
    {
      type: 'no_changes_collapsed',
      id: 'no_changes_collapsed_load',
      count: unchanged.length,
      duration: unchanged.reduce((acc, t) => acc + t.duration, 0),
    } satisfies ViteNoChanges,
    ...changed,
  ]
})

const nodes = computed<ViteFlowNode[]>(() => [
  ...resolveIds.value,
  ...loads.value,
  ...transforms.value,
])

function isSelectedAncestor(node?: ViteFlowNode) {
  if (!props.selected || !node)
    return false
  const indexSelected = nodes.value.indexOf(props.selected)
  const indexNode = nodes.value.indexOf(node)
  if (indexSelected >= indexNode)
    return true
  return false
}

function handleSelect(value: ViteFlowNode | null) {
  emit('select', value)
}

function countLineDiff(from?: string | null, to?: string | null) {
  if (from == null || to == null || from === to)
    return { added: 0, removed: 0 }

  const fromLines = new Set(from.split(/\n/g))
  const toLines = new Set(to.split(/\n/g))

  let added = 0
  let removed = 0

  toLines.forEach((line) => {
    if (!fromLines.has(line))
      added += 1
  })
  fromLines.forEach((line) => {
    if (!toLines.has(line))
      removed += 1
  })

  return { added, removed }
}
</script>

<template>
  <div class="select-none h-full of-auto ws-nowrap w-100vh of-visible">
    <!-- Importers section -->
    <div v-if="module.importers?.length" class="text-sm">
      <div class="flex">
        <VMenu>
          <FlowmapNode class-node-outer="border-dashed">
            <template #inner>
              <div class="flex items-center gap-1 text-sm text-blue px3 py1">
                <div class="i-ph-arrows-merge-duotone rotate-270" />
                {{ module.importers?.length }} importers
              </div>
            </template>
          </FlowmapNode>
          <template #popper="{ hide }">
            <div class="p2 flex flex-col gap-1">
              <DisplayModuleId
                v-for="importer of module.importers"
                :id="importer"
                :key="importer"
                :cwd="root"
                :link="modulesMap.has(importer)"
                class="hover:bg-active px2 py1 rounded"
                @click="hide"
              />
            </div>
          </template>
        </VMenu>
      </div>
      <div
        class="border-flow-line border-dashed pl-10 border-r h-4 w-1px z-flowmap-line"
      />
    </div>

    <!-- Main module node -->
    <div class="flex">
      <FlowmapNode
        :lines="{ bottom: true }"
        :active="selected != null"
      >
        <template #content>
          <div class="p2">
            <DisplayModuleId
              :id="module.id"
              :cwd="root"
            />
          </div>
        </template>
      </FlowmapNode>
      <template v-if="module.imports?.length">
        <div class="w-10 border-t border-base border-dashed mya" />
        <VMenu class="mya">
          <FlowmapNode class-node-outer="border-dashed">
            <template #inner>
              <div class="flex items-center gap-1 text-sm text-orange px3 py1">
                <div class="i-ph-arrows-split-duotone rotate-270" />
                {{ module.imports?.length }} imports
              </div>
            </template>
          </FlowmapNode>
          <template #popper="{ hide }">
            <div class="p2 flex flex-col gap-1">
              <DisplayModuleId
                v-for="imp of module.imports"
                :id="imp.module_id"
                :key="imp.module_id"
                :kind="imp.kind"
                :cwd="root"
                :link="modulesMap.has(imp.module_id)"
                class="hover:bg-active px2 py1 rounded"
                @click="hide"
              />
            </div>
          </template>
        </VMenu>
      </template>
    </div>

    <!-- Flow timeline content -->
    <FlowmapExpandable
      v-model:expanded="flowExpandResolveId"
      :expandable="resolveIds.length > 0"
      :class-root-node="resolveIds.length === 0 ? 'border-dashed' : ''"
      :active-start="isSelectedAncestor(resolveIds[0] || loads[0])"
      :active-end="isSelectedAncestor(loads[0])"
    >
      <template #node>
        <div class="i-ph-magnifying-glass-duotone" /> Resolve Id
        <span class="op50 text-xs">({{ resolveIds.length }})</span>
      </template>
      <template #container>
        <div>
          <FlowmapNodeModuleInfo
            v-for="(item, index) of resolveIds"
            :key="item.id"
            :item="item"
            :root="root"
            :modules="modules"
            :active="isSelectedAncestor(item)"
            :class="index > 0 ? 'pt-2' : ''"
            @select="handleSelect"
          />
        </div>
      </template>
    </FlowmapExpandable>

    <FlowmapExpandable
      v-model:expanded="flowExpandLoads"
      :expandable="loads.length > 0"
      :class-root-node="loads.length === 0 ? 'border-dashed' : ''"
      :active-start="isSelectedAncestor(loads[0])"
      :active-end="isSelectedAncestor(transforms[0])"
    >
      <template #node>
        <div class="i-ph-upload-simple-duotone" /> Load
        <span class="op50 text-xs">({{ loadNodes.length }})</span>
      </template>
      <template #container>
        <div>
          <FlowmapNodeModuleInfo
            v-for="(item, index) of loads"
            :key="item.id"
            :item="item"
            :root="root"
            :modules="modules"
            :active="isSelectedAncestor(item)"
            :class="index > 0 && item.type !== 'no_changes_hide' ? 'pt-2' : ''"
            @select="handleSelect"
            @toggle-show-all="flowShowAllLoads = !flowShowAllLoads"
          />
        </div>
      </template>
    </FlowmapExpandable>

    <FlowmapExpandable
      v-model:expanded="flowExpandTransforms"
      :expandable="transforms.length > 0"
      :class-root-node="transforms.length === 0 ? 'border-dashed' : ''"
      :active-start="isSelectedAncestor(transforms[0])"
      :active-end="isSelectedAncestor(transforms.at(-1))"
    >
      <template #node>
        <div class="i-ph-magic-wand-duotone" /> Transform
        <span v-if="transformsLoading" class="i-ph-spinner animate-spin" />
        <span v-else class="op50 text-xs">({{ transformNodes.length }})</span>
      </template>
      <template #container>
        <div>
          <FlowmapNodeModuleInfo
            v-for="(item, index) of transforms"
            :key="item.id"
            :item="item"
            :root="root"
            :modules="modules"
            :active="isSelectedAncestor(item)"
            :class="index > 0 && item.type !== 'no_changes_hide' ? 'pt-2' : ''"
            @select="handleSelect"
            @toggle-show-all="flowShowAllTransforms = !flowShowAllTransforms"
          />
        </div>
      </template>
    </FlowmapExpandable>
  </div>
</template>
