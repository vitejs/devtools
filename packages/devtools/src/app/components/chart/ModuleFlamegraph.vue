<script setup lang="ts">
import type { TreeNodeInput } from 'nanovis'
import type { ModuleInfo, SessionContext } from '~~/shared/types'
import { Flamegraph, normalizeTreeNode } from 'nanovis'
import { computed, defineProps, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'

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
  }))
  const loads = props.info.loads.map((load, idx) => n({
    id: `load-${idx}`,
    text: load.plugin_name,
    size: load.duration,
  }))
  const transforms = props.info.transforms.map((transform, idx) => n({
    id: `transform-${idx}`,
    text: transform.plugin_name,
    size: transform.duration,
  }))
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
    text: 'Module Flamegraph',
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
  return () => {
    disposeFlamegraph()
  }
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
  <div relative border="t base" pb10 py1>
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
