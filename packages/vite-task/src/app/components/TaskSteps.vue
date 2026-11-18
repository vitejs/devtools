<script setup lang="ts">
import type { PlanTask } from '../../shared/types'
import DisplayExpandableContainer from '@vitejs/devtools-ui/components/Display/DisplayExpandableContainer.vue'
import { computed, inject } from 'vue'
import { formatStepLabel, isCommand, isTaskInGraphKey, orderedTaskIds } from '../utils/task-plan'
import CacheDetails from './CacheDetails.vue'
import TaskCommand from './TaskCommand.vue'
import TaskFilePath from './TaskFilePath.vue'
import TaskId from './TaskId.vue'

const props = defineProps<{ task: PlanTask, stepIndex?: number, dependenciesHidden?: boolean }>()
defineEmits<{ select: [id: string] }>()
const visibleSteps = computed(() => props.stepIndex === undefined ? props.task.steps : props.task.steps.slice(props.stepIndex, props.stepIndex + 1))
const multipleStepsVisible = computed(() => visibleSteps.value.length > 1)
const dependencies = computed(() => props.dependenciesHidden ? undefined : props.task.dependsOn)
const cacheAfterDependencies = computed(() => {
  const step = visibleSteps.value[0]
  return dependencies.value?.length && !multipleStepsVisible.value && step && isCommand(step) ? step.cache : undefined
})
const isTaskInGraph = inject(isTaskInGraphKey)
if (!isTaskInGraph)
  throw new Error('Task navigation requires the vite-task graph provider.')
</script>

<template>
  <div class="flex flex-col gap3 min-w-0">
    <p v-if="!visibleSteps.length" class="m0 op50 text-sm italic">
      No steps
    </p>
    <template v-for="(step, index) in visibleSteps" :key="index">
      <component
        :is="multipleStepsVisible ? 'details' : 'section'" v-if="isCommand(step)" class="command-step"
        :open="multipleStepsVisible && (index === 0 || step.cache?.status === 'changed' || step.cache?.status === 'error') || undefined"
      >
        <component :is="multipleStepsVisible ? 'summary' : 'div'" v-if="stepIndex === undefined" class="py1 text-sm" :class="{ 'cursor-pointer': multipleStepsVisible }">
          <span class="inline-flex flex-wrap items-center gap2">
            <span v-if="multipleStepsVisible" class="text-xs font-mono op50">{{ index + 1 }}</span>
            <span :class="multipleStepsVisible ? 'font-mono font-medium' : 'op60'">{{ multipleStepsVisible ? formatStepLabel(step) : step.hook || 'Command' }}</span>
            <CacheDetails :cache="step.cache || { status: 'unavailable' }" mode="summary" />
          </span>
        </component>
        <div class="min-w-0" :class="{ mt2: stepIndex === undefined }">
          <TaskCommand :step="step" inspect-executable class="w-max max-w-[80%] truncate rounded border border-base bg-active px3 py2" />
          <div v-if="step.cwd !== undefined" class="flex items-baseline gap2 px3 mt1 text-xs">
            <span class="shrink-0 op65">Working directory</span>
            <TaskFilePath :path="step.cwd" />
          </div>
          <CacheDetails v-if="step.cache && !cacheAfterDependencies" :cache="step.cache" />
        </div>
      </component>
      <details v-else open>
        <summary class="cursor-pointer text-sm">
          <TaskId :id="step.expandedFrom" class="break-all" />
        </summary>
        <div v-for="id in orderedTaskIds(step.plan)" :key="id" class="mt3 border-l border-flow-line pl3">
          <TaskId :id="id" :fallback-package="step.plan[id]!.package" class="text-sm break-all" />
          <TaskSteps :task="step.plan[id]!" :dependencies-hidden="dependenciesHidden" class="mt2" @select="$emit('select', $event)" />
        </div>
        <p v-if="!Object.keys(step.plan).length" class="text-xs op50">
          No steps
        </p>
      </details>
    </template>
    <details v-if="dependencies?.length" class="max-w-3xl">
      <summary class="cursor-pointer text-sm">
        <span class="op60">Dependencies ({{ dependencies.length }})</span>
      </summary>
      <DisplayExpandableContainer :list="dependencies" class="mt2 flex flex-col gap1">
        <template #default="{ items }">
          <button
            v-for="id in items" :key="id" :disabled="!isTaskInGraph(id)"
            class="w-full truncate rounded border border-base px2 py1 text-left text-sm enabled:hover:bg-active"
            @click="$emit('select', id)"
          >
            <TaskId :id="id" />
          </button>
        </template>
      </DisplayExpandableContainer>
    </details>
    <CacheDetails v-if="cacheAfterDependencies" :cache="cacheAfterDependencies" />
  </div>
</template>
