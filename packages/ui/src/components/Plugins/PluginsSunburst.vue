<script setup lang="ts" generic="T extends { id: string, text?: string, size: number, children: T[], parent?: T, meta?: { type?: string } }">
import type { GraphBase, GraphBaseOptions } from 'nanovis'
import { colorToCssBackground } from 'nanovis'
import { useTemplateRef, watchEffect } from 'vue'
import ChartNavBreadcrumb from '../Chart/ChartNavBreadcrumb.vue'
import DisplayDuration from '../Display/DisplayDuration.vue'

const props = defineProps<{
  graph: GraphBase<any, GraphBaseOptions<any>>
  selected?: T
}>()

const emit = defineEmits<{
  (e: 'select', node: T | null): void
}>()

defineSlots<{
  module: (props: {
    child: T
  }) => void
}>()

const el = useTemplateRef<HTMLDivElement>('el')
watchEffect(() => el.value?.append(props.graph.el))

function getColor(child: T) {
  return colorToCssBackground(props.graph.options.getColor?.(child as any) || '#000')
}
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
      <div v-if="selected" class="grid grid-cols-[300px_1fr] gap-1">
        <template v-for="child of selected.children" :key="child.id">
          <button
            class="ws-nowrap text-nowrap text-left overflow-hidden text-ellipsis text-sm hover:bg-active rounded px2"
            @click="emit('select', child)"
          >
            <div v-if="child.meta?.type === 'hook'" class="flex gap2 items-center pl2 hover:bg-active">
              <i class="i-ph-function-duotone inline-flex" />
              <span class="font-mono text-sm">
                {{ child.text }}
              </span>
            </div>
            <slot v-else name="module" :child="child">
              <span>{{ child.text || child.id }}</span>
            </slot>
          </button>

          <button
            class="relative flex gap-1 items-center hover:bg-active rounded"
            @click="emit('select', child)"
          >
            <div
              class="h-5 rounded shadow border border-base"
              :style="{
                background: getColor(child),
                width: `${child.size / selected.size * 100}%`,
              }"
            />
            <DisplayDuration :duration="child.size" class="text-xs" />
            <div
              v-if="child.children.length > 0 && child.meta?.type !== 'hook'"
              v-tooltip="`${child.children.length} dependencies`"
              :title="`${child.children.length} dependencies`"
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
