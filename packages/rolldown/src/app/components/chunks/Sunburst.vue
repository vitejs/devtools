<script setup lang="ts">
import type { GraphBase, GraphBaseOptions } from 'nanovis'
import type { ChunkChartInfo, ChunkChartNode } from '~/types/chart'
import ChartNavBreadcrumb from '@vitejs/devtools-ui/components/Chart/ChartNavBreadcrumb.vue'
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
  <div class="grid grid-cols-[max-content_1fr] gap-2 p4">
    <div ref="el" class="w-500px" />
    <div class="flex flex-col gap-4">
      <ChartNavBreadcrumb
        class="border-b border-base py2"
        :selected="selected"
        :options="graph.options"
        @select="emit('select', $event)"
      />
      <div v-if="selected" class="grid grid-cols-[250px_1fr] gap-1">
        <template v-for="child of selected.children" :key="child.id">
          <button
            class="ws-nowrap text-nowrap text-left overflow-hidden text-ellipsis text-sm hover:bg-active rounded px2"
            @click="emit('select', child)"
          >
            <span v-if="child.meta && child.meta === selected?.meta" class="text-primary">(self)</span>
            <span v-else>{{ child.meta?.name || child.id }}</span>
          </button>

          <button
            class="relative flex gap-1 items-center hover:bg-active rounded"
            @click="emit('select', child)"
          >
            <div
              class="h-5 rounded shadow border border-base"
              :style="{
                background: colorToCssBackground(graph.options.getColor?.(child) || '#000'),
                width: `${child.size / selected.size * 100}%`,
              }"
            />
            <DisplayFileSizeBadge class="text-xs" :bytes="child.size" :total="selected.size" :percent-ratio="3" />
            <div
              v-if="child.children.length > 0"
              v-tooltip="`${child.children.length} modules`"
              :title="`${child.children.length} modules`"
              class="text-xs op-fade"
            >
              ({{ child.children.length }})
            </div>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
