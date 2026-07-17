<script setup lang="ts">
import type { TreeNodeInput } from 'nanovis'
import type { ViteModuleListItem } from '~/types/modules'
import DisplayDuration from '@vitejs/devtools-ui/components/Display/DisplayDuration.vue'
import { normalizeTimestamp } from '@vitejs/devtools-ui/utils/format'
import { Flamegraph, normalizeTreeNode } from 'nanovis'
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watch } from 'vue'

interface FlowTransform {
  name: string
  result?: string | null
  start: number
  end: number
}

interface ViteModuleFlamegraphItem {
  plugin_name: string
  duration: number
  timestamp_start: number
  timestamp_end: number
}

interface ViteModuleFlamegraphInfo {
  resolve_ids: ViteModuleFlamegraphItem[]
  loads: ViteModuleFlamegraphItem[]
  transforms: ViteModuleFlamegraphItem[]
}

const props = withDefaults(defineProps<{
  module: ViteModuleListItem
  transforms: FlowTransform[]
  flowNodeSelected?: boolean
}>(), {
  flowNodeSelected: false,
})

const n = (node: TreeNodeInput<any>) => normalizeTreeNode(node, undefined, false)

const info = computed<ViteModuleFlamegraphInfo>(() => {
  const first = props.transforms[0]
  const load = first && first.name !== '__load__'
    ? [{
        plugin_name: first.name,
        duration: Math.max(0, first.end - first.start),
        timestamp_start: first.start,
        timestamp_end: first.end,
      }]
    : []

  return {
    resolve_ids: props.module.plugins
      .filter(plugin => plugin.resolveId != null)
      .map((plugin, index) => ({
        plugin_name: plugin.name,
        duration: plugin.resolveId ?? 0,
        timestamp_start: index,
        timestamp_end: index + (plugin.resolveId ?? 0),
      })),
    loads: load,
    transforms: props.transforms
      .slice(1)
      .filter(transform => transform.name !== '__load__')
      .map(transform => ({
        plugin_name: transform.name,
        duration: Math.max(0, transform.end - transform.start),
        timestamp_start: transform.start,
        timestamp_end: transform.end,
      })),
  }
})

const tree = computed(() => {
  const resolveIds = info.value.resolve_ids.map((id, idx) => n({
    id: `resolveId-${idx}`,
    text: id.plugin_name,
    size: id.duration,
    meta: id,
  }))
  const loads = info.value.loads.map((load, idx) => n({
    id: `load-${idx}`,
    text: load.plugin_name,
    size: load.duration,
    meta: load,
  }))
  const transforms = info.value.transforms.map((transform, idx) => n({
    id: `transform-${idx}`,
    text: transform.plugin_name,
    size: transform.duration,
    meta: transform,
  }))
  const children = [
    n({
      id: '~resolves',
      text: 'Resolve Id',
      children: resolveIds,
    }),
    n({
      id: '~loads',
      text: 'Load',
      children: loads,
    }),
    n({
      id: '~transforms',
      text: 'Transform',
      children: transforms,
    }),
  ]

  return n({
    id: '~root',
    text: 'Module Flamegraph',
    children,
  })
})

const hoverNode = ref<{
  plugin_name: string
  duration: number
  meta: ViteModuleFlamegraphItem | undefined
} | null>(null)
const hoverX = ref<number>(0)
const hoverY = ref<number>(0)
const el = useTemplateRef<HTMLDivElement>('el')
const flamegraph = shallowRef<Flamegraph | null>(null)

function buildFlamegraph() {
  flamegraph.value = new Flamegraph(tree.value, {
    animate: true,
    palette: {
      fg: '#888',
    },
    getSubtext: (node) => {
      const p = node.size / tree.value.size * 100
      if (p > 15 && p !== 100) {
        return `${p.toFixed(1)}%`
      }
      return undefined
    },
    onHover(node, e) {
      if (!node) {
        hoverNode.value = null
        return
      }
      if (e) {
        hoverX.value = e.clientX
        hoverY.value = e.clientY
      }
      hoverNode.value = {
        plugin_name: node.text!,
        duration: node.size,
        meta: node.meta,
      }
    },
    onLeave() {
      hoverNode.value = null
    },
  })
  el.value!.appendChild(flamegraph.value!.el)
}

function disposeFlamegraph() {
  flamegraph.value?.dispose()
}

onMounted(() => {
  buildFlamegraph()
})

onUnmounted(() => {
  disposeFlamegraph()
})

watch(tree, async () => {
  disposeFlamegraph()
  buildFlamegraph()
}, {
  deep: true,
})

watch(() => props.flowNodeSelected, async () => {
  await nextTick()
  flamegraph.value?.resize()
})
</script>

<template>
  <div class="relative border-t border-base pb10 py1 mt4">
    <DisplayGraphHoverView :hover-x="hoverX" :hover-y="hoverY">
      <div
        v-if="hoverNode"
        class="border border-base rounded-lg shadow-lg px3 py2 bg-glass pointer-events-none text-sm max-w-80"
      >
        <div class="font-semibold font-mono text-base mb2">
          {{ hoverNode.plugin_name }}
        </div>
        <div v-if="hoverNode.meta" class="border-t border-base pt2 flex flex-col gap-1.5 min-w-48">
          <div class="flex justify-between items-center py1">
            <label class="text-xs opacity-70">Start Time</label>
            <time
              :datetime="new Date(hoverNode.meta.timestamp_start).toISOString()"
              class="font-mono text-xs px1.5 py0.5 rounded"
              bg="base/10"
            >
              {{ normalizeTimestamp(hoverNode.meta.timestamp_start) }}
            </time>
          </div>
          <div class="flex justify-between items-center py1">
            <label class="text-xs opacity-70">End Time</label>
            <time
              :datetime="new Date(hoverNode.meta.timestamp_end).toISOString()"
              class="font-mono text-xs px1.5 py0.5 rounded"
              bg="base/10"
            >
              {{ normalizeTimestamp(hoverNode.meta.timestamp_end) }}
            </time>
          </div>
          <div class="flex justify-between items-center py1 border-t border-base border-dashed pt2">
            <label class="text-xs op70">Duration</label>
            <DisplayDuration :duration="hoverNode.duration" />
          </div>
        </div>
        <div v-else>
          <DisplayDuration :duration="hoverNode.duration" />
        </div>
      </div>
    </DisplayGraphHoverView>
    <div ref="el" class="min-h-30" />
  </div>
</template>
