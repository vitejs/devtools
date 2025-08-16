<script setup lang="ts">
import type { TreeNodeInput } from 'nanovis'
import type { PluginBuildInfo, RolldownPluginBuildMetrics, SessionContext } from '~~/shared/types'
import { Flamegraph, normalizeTreeNode } from 'nanovis'
import { relative } from 'pathe'
import { computed, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { parseReadablePath } from '~/utils/filepath'
import { normalizeTimestamp } from '~/utils/format'
import { getFileTypeFromModuleId, ModuleTypeRules } from '~/utils/icon'

const props = defineProps<{
  session: SessionContext
  buildMetrics: RolldownPluginBuildMetrics
}>()

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

const n = (node: TreeNodeInput<PluginBuildInfo>) => normalizeTreeNode(node, undefined, false)

function normalizeModulePath(path: string) {
  const normalized = path.replace(/%2F/g, '/')
  const cwd = props.session!.meta.cwd
  let relate = cwd ? relative(cwd, normalized) : normalized
  if (!relate.startsWith('.'))
    relate = `./${relate}`
  if (relate.startsWith('./'))
    return relate
  if (relate.match(/^(?:\.\.\/){1,3}[^.]/))
    return relate
  return normalized
}

const tree = computed(() => {
  const resolveIds = moduleTypes.value.map((type, idx) => n({
    id: `resolveId-${type.name}-${idx}`,
    text: type.description,
    children: props.buildMetrics.resolveIdMetrics.filter((item) => {
      return getFileTypeFromModuleId(item.module).name === type.name
    }).map((id, idx) => n({
      id: `resolveId-${idx}`,
      text: normalizeModulePath(id.module),
      size: id.duration,
    })),
  }))
  const loads = moduleTypes.value.map((type, idx) => n({
    id: `loads-${type.name}-${idx}`,
    text: type.description,
    children: props.buildMetrics.loadMetrics.filter((item) => {
      return getFileTypeFromModuleId(item.module).name === type.name
    }).map((id, idx) => n({
      id: `resolveId-${idx}`,
      text: normalizeModulePath(id.module),
      size: id.duration,
    })),
  }))
  const transforms = moduleTypes.value.map((type, idx) => n({
    id: `transforms-${type.name}-${idx}`,
    text: type.description,
    children: props.buildMetrics.transformMetrics.filter((item) => {
      return getFileTypeFromModuleId(item.module).name === type.name
    }).map((id, idx) => n({
      id: `resolveId-${idx}`,
      text: normalizeModulePath(id.module),
      size: id.duration,
    })),
  }))

  // resolve/load/transform -> module type -> module
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
    text: 'Plugin Flamegraph',
    children,
  })
})

const hoverNode = ref<{
  plugin_name: string
  duration: number
  meta: PluginBuildInfo | undefined
} | null>(null)
const hoverX = ref<number>(0)
const hoverY = ref<number>(0)
const el = useTemplateRef<HTMLDivElement>('el')
const flamegraph = shallowRef<Flamegraph<PluginBuildInfo> | null>(null)

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
        <div flex="~" font-bold font-mono>
          <DisplayFileIcon v-if="hoverNode.meta" :filename="hoverNode.meta.module" mr1.5 />
          {{ hoverNode.plugin_name }}
        </div>
        <div v-if="hoverNode.meta">
          <div>
            <label>Start Time: </label>
            <time :datetime="new Date(hoverNode.meta.timestamp_start).toISOString()">{{ normalizeTimestamp(hoverNode.meta.timestamp_start) }}</time>
          </div>
          <div>
            <label>End Time: </label>
            <time :datetime="new Date(hoverNode.meta.timestamp_end).toISOString()">{{ normalizeTimestamp(hoverNode.meta.timestamp_end) }}</time>
          </div>
        </div>
        <div flex="~ gap-1">
          <label>Duration: </label>
          <DisplayDuration :duration="hoverNode.duration" />
        </div>
      </div>
    </Teleport>
    <div ref="el" min-h-30 />
  </div>
</template>
