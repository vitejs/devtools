<script setup lang="ts">
import type { TreeNodeInput } from 'nanovis'
import type { RolldownPluginBuildMetrics, SessionContext } from '~~/shared/types'
import { Flamegraph, normalizeTreeNode } from 'nanovis'
import { computed, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { parseReadablePath } from '~/utils/filepath'
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

// filter current module list existed module type
const existedModuleTypes = computed(() => ModuleTypeRules.filter(rule => parsedPaths.value.some(mod => rule.match.test(mod.mod.id))))

const n = (node: TreeNodeInput<any>) => normalizeTreeNode(node, undefined, false)

const tree = computed(() => {
  // build children: module group by module type
  const resolveIds = existedModuleTypes.value.map((type, idx) => n({
    id: `resolveId-${type.name}-${idx}`,
    text: type.name,
    children: props.buildMetrics.resolveIdMetrics.filter((item) => {
      return getFileTypeFromModuleId(item.module).name === type.name
    }).map((id, idx) => n({
      id: `resolveId-${idx}`,
      text: id.module,
      size: id.duration,
    })),
  }))

  const loads = existedModuleTypes.value.map((type, idx) => n({
    id: `loads-${type.name}-${idx}`,
    text: type.name,
    children: props.buildMetrics.loadMetrics.filter((item) => {
      return getFileTypeFromModuleId(item.module).name === type.name
    }).map((id, idx) => n({
      id: `resolveId-${idx}`,
      text: id.module,
      size: id.duration,
    })),
  }))

  const transforms = existedModuleTypes.value.map((type, idx) => n({
    id: `transforms-${type.name}-${idx}`,
    text: type.name,
    children: props.buildMetrics.transformMetrics.filter((item) => {
      return getFileTypeFromModuleId(item.module).name === type.name
    }).map((id, idx) => n({
      id: `resolveId-${idx}`,
      text: id.module,
      size: id.duration,
    })),
  }))

  // resolve/load/transform -> module type -> module
  const children = [
    n({
      id: '~resolves',
      text: 'resolve',
      children: resolveIds,
    }),
    n({
      id: '~loads',
      text: 'load',
      children: loads,
    }),
    n({
      id: '~transforms',
      text: 'transform',
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
        <div font-bold font-mono>
          {{ hoverNode.plugin_name }}
        </div>
        <DisplayDuration :duration="hoverNode.duration" />
      </div>
    </Teleport>
    <div ref="el" min-h-30 />
  </div>
</template>
