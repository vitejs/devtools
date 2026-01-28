<script setup lang="ts">
import type { GraphBase, GraphBaseOptions } from 'nanovis'
import type { ChunkChartInfo, ChunkChartNode } from '~/types/chart'
import { colorToCssBackground } from 'nanovis'
import { useTemplateRef, watchEffect } from 'vue'

const props = defineProps<{
  graph: GraphBase<ChunkChartInfo | undefined, GraphBaseOptions<ChunkChartInfo | undefined>>
  selected?: ChunkChartNode | undefined
}>()

const emit = defineEmits<{
  (e: 'select', node: ChunkChartNode | null): void
}>()

const el = useTemplateRef<HTMLDivElement>('el')
watchEffect(() => el.value?.append(props.graph.el))
</script>

<template>
  <div grid="~ cols-[max-content_1fr] gap-2" p4>
    <div ref="el" w-500px />
    <div flex="~ col gap-4">
      <ChartNavBreadcrumb
        border="b base" py2
        :selected="selected"
        :options="graph.options"
        @select="emit('select', $event)"
      />
      <div v-if="selected" grid="~ cols-[250px_1fr] gap-1">
        <template v-for="child of selected.children" :key="child.id">
          <button
            ws-nowrap text-nowrap text-left overflow-hidden text-ellipsis text-sm
            hover="bg-active" rounded px2
            @click="emit('select', child)"
          >
            <span v-if="child.meta && child.meta === selected?.meta" text-primary>(self)</span>
            <span v-else>{{ child.meta?.name || child.id }}</span>
          </button>

          <button
            relative flex="~ gap-1 items-center"
            hover="bg-active" rounded
            @click="emit('select', child)"
          >
            <div
              h-5 rounded shadow border="~ base"
              :style="{
                background: colorToCssBackground(graph.options.getColor?.(child) || '#000'),
                width: `${child.size / selected.size * 100}%`,
              }"
            />
            <DisplayFileSizeBadge text-xs :bytes="child.size" :total="selected.size" :percent-ratio="3" />
            <div
              v-if="child.children.length > 0"
              v-tooltip="`${child.children.length} modules`"
              :title="`${child.children.length} modules`"
              text-xs op-fade
            >
              ({{ child.children.length }})
            </div>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
