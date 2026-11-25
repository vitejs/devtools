<script setup lang="ts">
import type { CommandStep, PlanTask, StepCache } from '../../shared/types'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayDuration from '@vitejs/devtools-ui/components/Display/DisplayDuration.vue'
import DisplayExpandableContainer from '@vitejs/devtools-ui/components/Display/DisplayExpandableContainer.vue'
import { computed, inject, reactive } from 'vue'
import { isCommand, isTaskInGraphKey, orderedTaskIds } from '../utils/task-plan'
import CacheDetails from './CacheDetails.vue'
import CacheStatusBadge from './CacheStatusBadge.vue'
import TaskCommand from './TaskCommand.vue'
import TaskFilePath from './TaskFilePath.vue'
import TaskId from './TaskId.vue'

const props = defineProps<{ task: PlanTask, stepIndex?: number, dependenciesHidden?: boolean }>()
defineEmits<{ select: [id: string] }>()
const visibleSteps = computed(() => props.stepIndex === undefined ? props.task.steps : props.task.steps.slice(props.stepIndex, props.stepIndex + 1))
const multipleStepsVisible = computed(() => visibleSteps.value.length > 1)
const sharedCacheStatus = computed(() => {
  const [first] = visibleSteps.value
  if (!multipleStepsVisible.value || !first || !isCommand(first))
    return undefined
  const status = first.cache?.status ?? 'unavailable'
  return visibleSteps.value.every(step => isCommand(step) && (step.cache?.status ?? 'unavailable') === status) ? status : undefined
})
function cacheDetailsAvailable(cache?: StepCache) {
  return !!(cache?.baseline || cache?.changes?.length || cache?.changesPartial || cache?.message)
}

const collapsedSteps = reactive(new WeakSet<CommandStep>())
function toggleCacheDetails(step: CommandStep) {
  if (collapsedSteps.has(step))
    collapsedSteps.delete(step)
  else
    collapsedSteps.add(step)
}

function onCommandClick(step: CommandStep) {
  if (cacheDetailsAvailable(step.cache) && !window.getSelection()?.toString())
    toggleCacheDetails(step)
}

const dependencies = computed(() => props.dependenciesHidden ? undefined : props.task.dependsOn)
const isTaskInGraph = inject(isTaskInGraphKey)
if (!isTaskInGraph)
  throw new Error('Task navigation requires the vite-task graph provider.')
</script>

<template>
  <div class="flex flex-col gap3 min-w-0">
    <p v-if="!visibleSteps.length" class="m0 op50 text-sm italic">
      No steps
    </p>
    <component :is="multipleStepsVisible ? 'ol' : 'div'" v-if="visibleSteps.length" class="m0 flex list-none flex-col gap4 p0" :class="{ 'w-max max-w-full min-w-[min(100%,32rem)]': multipleStepsVisible }">
      <component :is="multipleStepsVisible ? 'li' : 'div'" v-for="(step, index) in visibleSteps" :key="index">
        <section v-if="isCommand(step)">
          <div
            class="group flex max-w-full items-center gap2 rounded border border-base bg-active px3 py1.5"
            :class="[multipleStepsVisible ? 'w-full' : 'w-max', { 'cursor-pointer': cacheDetailsAvailable(step.cache) }]"
            @click="onCommandClick(step)"
          >
            <span aria-hidden="true" class="font-mono op40">$</span>
            <TaskCommand :step="step" single-line class="min-w-0" :class="{ 'mr-auto': multipleStepsVisible }" />
            <template v-if="!sharedCacheStatus">
              <DisplayBadge v-if="step.cache?.status === 'unknown'" :color="false" class="bg-active">
                Cache status unknown
              </DisplayBadge>
              <CacheStatusBadge v-else :status="step.cache?.status ?? 'unavailable'" class="shrink-0" />
            </template>
            <DisplayDuration v-if="step.cache?.baseline" :duration="step.cache.baseline.durationMs" class="shrink-0 text-xs" />
            <button
              v-if="cacheDetailsAvailable(step.cache)" type="button" aria-label="Toggle cache details"
              :aria-expanded="!collapsedSteps.has(step)" class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded op40 group-hover:op100 focus-visible:op100 focus-visible:outline focus-visible:outline-offset-2"
              @click.stop="toggleCacheDetails(step)"
            >
              <span aria-hidden="true" class="i-ph-caret-right h-3 w-3" :class="{ 'rotate-90': !collapsedSteps.has(step) }" />
            </button>
          </div>
          <div v-if="step.cwd !== undefined" :class="{ '[contain:inline-size]': multipleStepsVisible }" class="flex items-baseline gap2 pl4 text-xs">
            <span class="op65">Working directory</span><TaskFilePath :path="step.cwd" />
          </div>
          <CacheDetails v-if="step.cache && cacheDetailsAvailable(step.cache)" v-show="!collapsedSteps.has(step)" :cache="step.cache" class="mt1 pl3" :class="{ '[contain:inline-size] w-full!': multipleStepsVisible }" />
        </section>
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
      </component>
    </component>
    <div v-if="sharedCacheStatus" class="flex items-center gap2 text-xs">
      <DisplayBadge v-if="sharedCacheStatus === 'unknown'" :color="false" class="bg-active">
        Cache status unknown
      </DisplayBadge>
      <CacheStatusBadge v-else :status="sharedCacheStatus" />
      <span class="op60">· {{ visibleSteps.length }} steps</span>
    </div>
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
  </div>
</template>
