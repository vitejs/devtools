<script setup lang="ts">
import { createLinkHorizontal } from '@vitejs/devtools-ui/composables/module-graph'
import { computed, inject } from 'vue'
import { isTaskInGraphKey } from '../utils/task-plan'
import TaskId from './TaskId.vue'

const props = defineProps<{ selected: string, dependencies: string[], dependents: string[] }>()
defineEmits<{ select: [id: string] }>()

const isTaskInGraph = inject(isTaskInGraphKey)
if (!isTaskInGraph)
  throw new Error('Task navigation requires the vite-task graph provider.')

// Match the 30px rows, 4px gaps and 80px connectors in Rolldown's Imports view.
const rowHeight = 30
const gap = 4
const linkWidth = 80
const sides = computed(() => [
  { label: 'Dependents', ids: props.dependents, left: true },
  { label: 'Dependencies', ids: props.dependencies, left: false },
].filter(side => side.ids.length).map((side) => {
  const height = side.ids.length * (rowHeight + gap) - gap
  const paths = side.ids.map((_, index) => {
    const y = rowHeight / 2 + index * (rowHeight + gap)
    return createLinkHorizontal({
      source: [0, side.left ? y : height / 2],
      target: [linkWidth, side.left ? height / 2 : y],
    })
  })
  return { ...side, height, paths }
}))
</script>

<template>
  <div class="min-h-0 of-auto px2 py4" role="group" aria-label="Task dependencies">
    <div v-if="sides.length" class="flex items-center w-full">
      <div v-for="side in sides" :key="side.label" role="group" :aria-label="side.label" class="flex min-w-fit items-center" :class="side.left ? 'order-0' : 'order-2 flex-row-reverse'">
        <div class="flex flex-col w-max max-w-[320px]" :style="{ gap: `${gap}px` }">
          <button
            v-for="id in side.ids" :key="id" :disabled="!isTaskInGraph(id)"
            class="text-left px2 text-sm bg-base border border-base rounded truncate hover:bg-active"
            :style="{ height: `${rowHeight}px` }" @click="$emit('select', id)"
          >
            <TaskId :id="id" />
          </button>
        </div>
        <svg :width="linkWidth" :height="side.height" class="shrink-0 pointer-events-none" aria-hidden="true">
          <path v-for="(path, index) in side.paths" :key="side.ids[index]" :d="path ?? undefined" fill="none" class="stroke-current op25" />
        </svg>
      </div>
      <span role="img" :aria-label="selected" :title="selected" class="order-1 w-4 h-4 shrink-0 rounded-full border-3 border-active bg-base" />
    </div>
    <div v-else class="h-48 flex items-center justify-center op50 italic">
      No dependencies or dependents
    </div>
  </div>
</template>
