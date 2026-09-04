<script setup lang="ts">
import type { Edge, Node } from '@vue-flow/core'
import type { HmrGraphEdge, HmrGraphNode } from '~~/shared/types'
import dagre from '@dagrejs/dagre'
import { Handle, Position, VueFlow } from '@vue-flow/core'
import { computed } from 'vue'

const props = defineProps<{
  nodes: HmrGraphNode[]
  edges: HmrGraphEdge[]
}>()

function fileName(id: string) {
  return id.replace(/^.*\//, '')
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 36

const flowData = computed(() => {
  // Build dagre graph for auto-layout
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 20 })

  const idMap = new Map<string, string>() // original → safe
  for (const [index, node] of props.nodes.entries()) {
    const sid = `node-${index}`
    idMap.set(node.id, sid)
    g.setNode(sid, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  for (const edge of props.edges) {
    const from = idMap.get(edge.from)
    const to = idMap.get(edge.to)
    if (from && to)
      g.setEdge(from, to)
  }

  dagre.layout(g)

  const nodeColorMap: Record<string, string> = {
    source: 'hmr-node-source',
    intermediate: 'hmr-node-intermediate',
    boundary: 'hmr-node-boundary',
  }

  const flowNodes: Node[] = props.nodes.map((n) => {
    const sid = idMap.get(n.id)!
    const pos = g.node(sid)
    return {
      id: sid,
      type: 'hmr',
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: {
        label: fileName(n.id),
        fullPath: n.id,
        nodeType: n.type,
        moduleType: n.moduleType,
        selfAccepting: n.selfAccepting,
        colorClass: nodeColorMap[n.type] ?? '',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }
  })

  const flowEdges: Edge[] = props.edges.map((e, i) => ({
    id: `e${i}`,
    source: idMap.get(e.from)!,
    target: idMap.get(e.to)!,
    animated: true,
    style: { stroke: 'rgba(148, 163, 184, 0.4)', strokeWidth: 1.5 },
  }))

  return { nodes: flowNodes, edges: flowEdges }
})
</script>

<template>
  <div class="hmr-graph-container">
    <VueFlow
      :nodes="flowData.nodes"
      :edges="flowData.edges"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :zoom-on-scroll="true"
      :zoom-on-pinch="true"
      :zoom-on-double-click="true"
      :pan-on-drag="true"
      :pan-on-scroll="false"
      :prevent-scrolling="true"
      fit-view-on-init
      :fit-view-options="{ padding: 0.3 }"
      :default-viewport="{ x: 0, y: 0, zoom: 1 }"
      :min-zoom="0.5"
      :max-zoom="1.5"
    >
      <template #node-hmr="{ data }">
        <div
          class="hmr-node"
          :class="data.colorClass"
          :title="data.fullPath"
        >
          <Handle type="target" :position="Position.Left" />
          <Handle type="source" :position="Position.Right" />
          <span class="hmr-node-label">{{ data.label }}</span>
          <span v-if="data.selfAccepting" class="hmr-node-badge">self</span>
          <span v-if="data.moduleType" class="hmr-node-type">{{ data.moduleType }}</span>
        </div>
      </template>
    </VueFlow>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

.hmr-graph-container {
  width: 100%;
  height: 200px;
}

.hmr-graph-container .vue-flow {
  background: transparent;
}

.hmr-graph-container .vue-flow__background {
  display: none;
}

.hmr-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  border: 1px solid;
  white-space: nowrap;
  max-width: 180px;
}

.hmr-node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.hmr-node-badge {
  font-size: 9px;
  opacity: 0.5;
  flex-shrink: 0;
}

.hmr-node-type {
  font-size: 9px;
  opacity: 0.35;
  font-family: system-ui, sans-serif;
  flex-shrink: 0;
}

.hmr-node-source {
  background: rgba(74, 222, 128, 0.12);
  border-color: rgba(74, 222, 128, 0.5);
  color: rgb(74, 222, 128);
}

.hmr-node-intermediate {
  background: rgba(148, 163, 184, 0.08);
  border-color: rgba(148, 163, 184, 0.3);
  color: rgb(148, 163, 184);
}

.hmr-node-boundary {
  background: rgba(96, 165, 250, 0.12);
  border-color: rgba(96, 165, 250, 0.5);
  color: rgb(96, 165, 250);
}

/* Hide default Vue Flow node styling */
.hmr-graph-container .vue-flow__node-hmr {
  background: transparent;
  border: none;
  padding: 0;
  border-radius: 0;
  box-shadow: none;
}

/* Style handles */
.hmr-graph-container .vue-flow__handle {
  width: 4px;
  height: 4px;
  opacity: 0;
}
</style>
