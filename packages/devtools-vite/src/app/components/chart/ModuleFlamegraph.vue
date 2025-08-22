<script setup lang="ts">
import type { TreeNodeInput } from 'nanovis'
import type {
  ModuleInfo,
  RolldownModuleLoadInfo,
  RolldownModuleTransformInfo,
  RolldownResolveInfo,
  SessionContext,
} from '~~/shared/types'
import { Flamegraph, normalizeTreeNode } from 'nanovis'
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { normalizeTimestamp } from '~/utils/format'

const props = defineProps<{
  info: ModuleInfo
  session: SessionContext
  flowNodeSelected: boolean
}>()

const n = (node: TreeNodeInput<any>) => normalizeTreeNode(node, undefined, false)

const tree = computed(() => {
  const resolveIds = props.info.resolve_ids.map((id, idx) => n({
    id: `resolveId-${idx}`,
    text: id.plugin_name,
    size: id.duration,
    meta: id,
  }))
  const loads = props.info.loads.map((load, idx) => n({
    id: `load-${idx}`,
    text: load.plugin_name,
    size: load.duration,
    meta: load,
  }))
  const transforms = props.info.transforms.map((transform, idx) => n({
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
  meta: RolldownResolveInfo | RolldownModuleLoadInfo | RolldownModuleTransformInfo | undefined
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
  <div relative border="t base" pb10 py1 mt4>
    <Teleport to="body">
      <div
        v-if="hoverNode"
        border="~ base" rounded shadow px2 py1 fixed
        z-panel-content bg-glass pointer-events-none text-sm
        :style="{ left: `${hoverX}px`, top: `${hoverY}px` }"
      >
        <div font-bold font-mono>
          {{ hoverNode.plugin_name }}
        </div>
        <div v-if="hoverNode.meta" border="t base" pt2 flex="~ col gap-1.5" min-w-48>
          <div flex="~ justify-between items-center" py1>
            <label text-xs opacity-70>Start Time</label>
            <time
              :datetime="new Date(hoverNode.meta.timestamp_start).toISOString()"
              font-mono text="xs"
              bg="base/10"
              px1.5 py0.5 rounded
            >
              {{ normalizeTimestamp(hoverNode.meta.timestamp_start) }}
            </time>
          </div>
          <div flex="~ justify-between items-center" py1>
            <label text-xs opacity-70>End Time</label>
            <time
              :datetime="new Date(hoverNode.meta.timestamp_end).toISOString()"
              font-mono text="xs"
              bg="base/10"
              px1.5 py0.5 rounded
            >
              {{ normalizeTimestamp(hoverNode.meta.timestamp_end) }}
            </time>
          </div>
          <div flex="~ justify-between items-center" py1 border="t base dashed" pt2>
            <label text="xs" op70>Duration</label>
            <DisplayDuration :duration="hoverNode.duration" />
          </div>
        </div>
        <div v-else>
          <DisplayDuration :duration="hoverNode.duration" />
        </div>
      </div>
    </Teleport>
    <div ref="el" min-h-30 />
  </div>
</template>
