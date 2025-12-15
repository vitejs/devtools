<script setup lang="ts">
import type { TreeNodeInput } from 'nanovis'
import type { PluginBuildInfo, SessionContext } from '~~/shared/types'
import type { PluginChartInfo, PluginChartNode } from '~/types/chart'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'
import { useAsyncState, useMouse } from '@vueuse/core'
import { normalizeTreeNode, Sunburst } from 'nanovis'
import { computed, reactive, watch } from 'vue'
import { settings } from '~~/app/state/settings'
import { useChartGraph } from '~/composables/chart'
import { parseReadablePath } from '~/utils/filepath'
import { formatDuration, normalizeTimestamp } from '~/utils/format'
import { getFileTypeFromModuleId, ModuleTypeRules } from '~/utils/icon'

const props = defineProps<{
  plugin: string
  session: SessionContext
}>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const route = useRoute()
const rpc = useRpc()
const { state, isLoading } = useAsyncState(
  async () => {
    const res = await rpc.value.call(
      'vite:rolldown:get-plugin-details',
      {
        session: props.session.id,
        id: route.query.plugin as string,
      },
    )
    return res
  },
  null,
)

const processedModules = computed(() => {
  const seen = new Set()
  return state.value?.calls?.filter((call) => {
    if (seen.has(call.module)) {
      return false
    }
    seen.add(call.module)
    return true
  }) ?? []
})

const hookLoadDuration = computed(() => state.value?.loadMetrics.reduce((arc, item) => arc + item.duration, 0))

const hookTransformDuration = computed(() => state.value?.transformMetrics.reduce((arc, item) => arc + item.duration, 0))

const hookResolveIdDuration = computed(() => state.value?.resolveIdMetrics.reduce((arc, item) => arc + item.duration, 0))

const totalDuration = computed(() => state.value?.calls?.reduce((arc, item) => arc + item.duration, 0))

const parsedPaths = computed(() => props.session.modulesList.map((mod) => {
  const path = parseReadablePath(mod.id, props.session.meta.cwd)
  const type = getFileTypeFromModuleId(mod.id)
  return {
    mod,
    path,
    type,
  }
}))
const moduleTypes = computed(() => ModuleTypeRules.filter(rule => parsedPaths.value.some(mod => rule.match.test(mod.mod.id))))

const _tree = computed(() => {
  const map = new Map<string, TreeNodeInput<PluginChartInfo | undefined>>()
  const maxDepth = 3
  if (!state.value) {
    return {
      root: createNode({
        id: '~root',
        text: 'Project',
        children: [],
      }),
      map: new Map(),
      maxDepth,
    }
  }

  function createNode(node: TreeNodeInput<PluginChartInfo | undefined>, parent?: PluginChartNode) {
    map.set(node.id!, node)
    const normalizedNode = normalizeTreeNode(node, parent, (a, b) => (b?.meta?.duration ?? 0) - (a?.meta?.duration ?? 0))

    if (normalizedNode.children) {
      normalizedNode.children.forEach((child) => {
        child.parent = normalizedNode
      })
    }

    return normalizedNode
  }

  function createMetricsNodes(prefix: string, metrics: PluginBuildInfo[]) {
    const otherTypes = metrics.filter(item => !moduleTypes.value.some(type => getFileTypeFromModuleId(item.module!).name === type.name))
    return [
      ...moduleTypes.value.map((type, idx) => {
        const filteredMetrics = metrics.filter(item => getFileTypeFromModuleId(item.module!).name === type.name)
        return createNode({
          id: `${prefix}-${type.name}-${idx}`,
          text: type.description,
          children: filteredMetrics.map((item, idx) => createNode({
            id: `${prefix}-${idx}`,
            text: item.module,
            size: item.duration,
            meta: item as unknown as PluginChartInfo,
          })),
          meta: {
            type: 'module',
            title: type.description,
            id: `${prefix}-${type.name}-${idx}`,
            duration: filteredMetrics.reduce((arc, item) => arc + item.duration, 0),
          } as unknown as PluginChartInfo,
        })
      }),
      // other types node
      createNode({
        id: `${prefix}-other`,
        text: 'Other',
        children: otherTypes.map((item, idx) => createNode({
          id: `${prefix}-other-${idx}`,
          text: item.module,
          size: item.duration,
          meta: item as unknown as PluginChartInfo,
        })),
        meta: {
          type: 'module',
          title: 'Other',
          id: `${prefix}-other`,
          duration: otherTypes.reduce((arc, item) => arc + item.duration, 0),
        } as unknown as PluginChartInfo,
      }),
    ]
  }

  const resolveIds = createMetricsNodes('resolveId', state.value!.resolveIdMetrics)
  const loads = createMetricsNodes('loads', state.value!.loadMetrics)
  const transforms = createMetricsNodes('transforms', state.value!.transformMetrics)

  function createHookNode(id: string, text: string, children: PluginChartNode[]) {
    return createNode({
      id,
      text,
      children: children.sort((a, b) => b.size - a.size),
      meta: {
        id,
        type: 'hook',
        title: text,
        duration: {
          '~loads': hookLoadDuration.value,
          '~resolves': hookResolveIdDuration.value,
          '~transforms': hookTransformDuration.value,
        }[id],
      } as unknown as PluginChartInfo,
    })
  }

  // resolve/load/transform -> module type -> module
  const children = [
    createHookNode('~resolves', 'Resolve Id', resolveIds),
    createHookNode('~loads', 'Load', loads),
    createHookNode('~transforms', 'Transform', transforms),
  ]

  const root = createNode({
    id: '~root',
    text: 'Project',
    children,
  })

  return {
    root,
    map,
    maxDepth,
  }
})

const mouse = reactive(useMouse())
const { tree, chartOptions, graph, nodeHover, nodeSelected, selectedNode, selectNode, buildGraph } = useChartGraph<PluginChartInfo, PluginChartInfo, PluginChartNode>({
  data: [],
  tree: _tree,
  nameKey: 'id',
  sizeKey: 'duration',
  rootText: 'Project',
  graphOptions: {
    onClick(node) {
      if (node)
        nodeHover.value = node
      selectedNode.value = node.meta
    },
    onHover(node) {
      if (node)
        nodeHover.value = node
      if (node === null)
        nodeHover.value = undefined
    },
    onLeave() {
      nodeHover.value = undefined
    },
    onSelect(node) {
      nodeSelected.value = node || tree.value.root
      selectedNode.value = node?.meta
    },
    getSubtext(node) {
      return formatDuration(node.size, true)
    },
  },
  onUpdate() {
    graph.value = new Sunburst(tree.value.root, chartOptions.value)
  },
})

watch(() => settings.value.pluginDetailsViewType, () => {
  buildGraph()
})
</script>

<template>
  <VisualLoading v-if="isLoading" />
  <div v-else-if="state?.calls?.length" relative h-full w-full>
    <DisplayCloseButton
      absolute right-2 top-1.5
      @click="emit('close')"
    />
    <div
      bg-glass absolute left-2 top-2 z-panel-content p2
      border="~ base rounded-lg"
      flex="~ col gap-2"
    >
      <div font-mono px1>
        <DisplayPluginName :name="state?.plugin_name!" />
      </div>
      <div text-xs font-mono flex="~ items-center gap-3" ml2>
        <DisplayDuration
          :duration="hookResolveIdDuration" flex="~ gap-1 items-center"
          :title="`Resolve Id hooks cost: ${formatDuration(hookResolveIdDuration, true)}`"
        >
          <span i-ph-magnifying-glass-duotone inline-block />
        </DisplayDuration>
        <DisplayDuration
          :duration="hookLoadDuration" flex="~ gap-1 items-center"
          :title="`Load hooks cost: ${formatDuration(hookLoadDuration, true)}`"
        >
          <span i-ph-upload-simple-duotone inline-block />
        </DisplayDuration>
        <DisplayDuration
          :duration="hookTransformDuration" flex="~ gap-1 items-center"
          :title="`Transform hooks cost: ${formatDuration(hookTransformDuration, true)}`"
        >
          <span i-ph-magic-wand-duotone inline-block />
        </DisplayDuration>
        <span op40>|</span>
        <DisplayDuration
          :duration="totalDuration" flex="~ gap-1 items-center"
          :title="`Total build cost: ${formatDuration(totalDuration, true)}`"
        >
          <span i-ph-clock-duotone inline-block />
        </DisplayDuration>
        <span op40>|</span>
        <DisplayNumberBadge
          :number="processedModules.length" icon="i-catppuccin-java-class-abstract"
          color="transparent color-scale-neutral"
          :title="`Module processed: ${processedModules.length}`"
        />
        <span op40>|</span>
        <DisplayNumberBadge
          :number="state?.calls?.length ?? 0" icon="i-ph-arrow-counter-clockwise"
          color="transparent color-scale-neutral"
          :title="`Total calls: ${state?.calls?.length ?? 0}`"
        />
      </div>
      <div flex="~ gap-2">
        <button
          :class="settings.pluginDetailsViewType === 'flow' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="settings.pluginDetailsViewType = 'flow'"
        >
          <div i-ph-git-branch-duotone rotate-180 />
          Build Flow
        </button>
        <button
          :class="settings.pluginDetailsViewType === 'sunburst' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="settings.pluginDetailsViewType = 'sunburst'"
        >
          <div i-ph-chart-sunburst-duotone />
          Sunburst
        </button>
      </div>
    </div>
    <div of-auto h-full pt-30>
      <FlowmapPluginFlow
        v-if="settings.pluginDetailsViewType === 'flow'"
        :session="session"
        :build-metrics="state"
      />
      <PluginsSunburst
        v-if="settings.pluginDetailsViewType === 'sunburst' && graph"
        :graph="graph"
        :session="session"
        :selected="nodeSelected"
        @select="selectNode"
      />
    </div>
  </div>
  <div v-else flex="~ items-center justify-center" w-full h-full>
    <span italic op50>
      No data
    </span>
  </div>
  <DisplayGraphHoverView :hover-x="mouse.x" :hover-y="mouse.y">
    <div
      v-if="nodeHover"
      border="~ base" rounded-lg shadow-lg px3 py2
      bg-glass pointer-events-none text-sm max-w-80
    >
      <div v-if="nodeHover.meta?.title" flex="~ items-center gap2">
        {{ nodeHover.meta.title }}
        <DisplayDuration :duration="nodeHover.meta.duration" />
      </div>
      <template v-else>
        <div v-if="nodeHover.meta?.module" flex="~" font-semibold font-mono text-base mb2>
          <DisplayModuleId :id="nodeHover.meta.module" :session="session" :link="false" />
        </div>
        <div v-if="nodeHover.meta?.module" border="t base" pt2 flex="~ col gap-1.5" min-w-48>
          <div flex="~ justify-between items-center" py1>
            <label text-xs opacity-70>Start Time</label>
            <time
              :datetime="new Date(nodeHover.meta.timestamp_start).toISOString()"
              font-mono text="xs"
              bg="base/10"
              px1.5 py0.5 rounded
            >
              {{ normalizeTimestamp(nodeHover.meta.timestamp_start) }}
            </time>
          </div>
          <div flex="~ justify-between items-center" py1>
            <label text-xs opacity-70>End Time</label>
            <time
              :datetime="new Date(nodeHover.meta.timestamp_end).toISOString()"
              font-mono text="xs"
              bg="base/10"
              px1.5 py0.5 rounded
            >
              {{ normalizeTimestamp(nodeHover.meta.timestamp_end) }}
            </time>
          </div>
          <div flex="~ justify-between items-center" py1 border="t base dashed" pt2>
            <label text="xs" op70>Duration</label>
            <DisplayDuration :duration="nodeHover.meta.duration" />
          </div>
        </div>

        <div v-else>
          <DisplayDuration :duration="nodeHover.meta?.duration" />
        </div>
      </template>
    </div>
  </DisplayGraphHoverView>
</template>
