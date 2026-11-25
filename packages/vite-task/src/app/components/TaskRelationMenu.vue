<script setup lang="ts">
import FlowmapNode from '@vitejs/devtools-ui/components/Flowmap/FlowmapNode.vue'
import { Dropdown as VDropdown } from 'floating-vue'
import { inject } from 'vue'
import { isTaskInGraphKey } from '../utils/task-plan'
import TaskId from './TaskId.vue'

defineProps<{ ids: string[], direction: 'dependencies' | 'dependents' }>()
defineEmits<{ select: [id: string] }>()
const isTaskInGraph = inject(isTaskInGraphKey)
if (!isTaskInGraph)
  throw new Error('Task navigation requires the vite-task graph provider.')
</script>

<template>
  <VDropdown placement="bottom-start">
    <FlowmapNode class-node-outer="border-dashed">
      <template #inner>
        <button class="flex items-center gap1 text-sm px3 py1" :class="direction === 'dependencies' ? 'text-orange' : 'text-blue'">
          <i class="rotate-270" :class="direction === 'dependencies' ? 'i-ph-arrows-split-duotone' : 'i-ph-arrows-merge-duotone'" />
          {{ ids.length }} {{ ids.length !== 1 ? direction : direction === 'dependencies' ? 'dependency' : 'dependent' }}
        </button>
      </template>
    </FlowmapNode>
    <template #popper="{ hide }">
      <div class="flex flex-col items-start gap1 p2 max-h-60 of-auto">
        <button v-for="id in ids" :key="id" class="px2 py1 hover:bg-active rounded text-sm text-left" :disabled="!isTaskInGraph(id)" @click="hide(); $emit('select', id)">
          <TaskId :id="id" class="break-all" />
        </button>
      </div>
    </template>
  </VDropdown>
</template>
