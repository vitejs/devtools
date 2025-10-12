<script setup lang="ts">
import type { GraphBase, GraphBaseOptions } from 'nanovis'
import type { SessionContext } from '~~/shared/types'
import type { PluginChartInfo, PluginChartNode } from '~/types/chart'
import { colorToCssBackground } from 'nanovis'
import { useTemplateRef, watchEffect } from 'vue'

const props = defineProps<{
  graph: GraphBase<PluginChartInfo | undefined, GraphBaseOptions<PluginChartInfo | undefined>>
  selected?: PluginChartNode | undefined
  session: SessionContext
}>()

const emit = defineEmits<{
  (e: 'select', node: PluginChartNode | null): void
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
      <div v-if="selected" grid="~ cols-[300px_1fr] gap-1">
        <template v-for="child of selected.children" :key="child.id">
          <button
            ws-nowrap text-nowrap text-left overflow-hidden text-ellipsis text-sm
            hover="bg-active" rounded px2
            @click="emit('select', child)"
          >
            <span v-if="child.meta && child.meta === selected?.meta" text-primary>(self)</span>
            <DisplayModuleId
              v-else
              :id="child.text!"
              w-full border-none ws-nowrap
              :session="session"
              hover="bg-active"
              border="~ base rounded" block px2 py1
            />
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
            <DisplayDuration :duration="child.size" text-xs />
            <div
              v-if="child.children.length > 0"
              v-tooltip="`${child.children.length} dependencies`"
              :title="`${child.children.length} dependencies`"
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
