<script setup lang="ts">
import type { GraphTask, RunPlan } from '../../shared/types'
import DisplayCloseButton from '@vitejs/devtools-ui/components/Display/DisplayCloseButton.vue'
import DisplayDuration from '@vitejs/devtools-ui/components/Display/DisplayDuration.vue'
import VisualLoading from '@vitejs/devtools-ui/components/Visual/VisualLoading.vue'
import { computed, ref } from 'vue'
import { planRows } from '../utils/task-plan'
import TaskDependencies from './TaskDependencies.vue'
import TaskFlow from './TaskFlow.vue'
import TaskId from './TaskId.vue'
import TaskSteps from './TaskSteps.vue'

const props = defineProps<{ graphTasks: Record<string, GraphTask>, selected: string, plan?: RunPlan, planLoading: boolean, planError: string }>()
defineEmits<{ close: [], retry: [], select: [id: string] }>()
const views = [
  { name: 'Task Flow', icon: 'i-ph-git-branch-duotone rotate-180' },
  { name: 'Commands', icon: 'i-ph-terminal-window-duotone' },
  { name: 'Dependencies', icon: 'i-ph-graph-duotone' },
] as const
const view = ref<typeof views[number]['name']>('Task Flow')
const rows = computed(() => planRows(props.plan?.plan ?? {}, props.selected))
const cachedStepDurationsMs = computed(() => rows.value.flatMap(row => row.cachedStepDurationsMs))
const dependencies = computed(() => props.graphTasks[props.selected]?.dependsOn ?? [])
const dependents = computed(() => Object.keys(props.graphTasks).filter(id => props.graphTasks[id]?.dependsOn?.includes(props.selected)))
const metrics = computed(() => [
  { status: 'hit', label: 'Cache hit', icon: 'i-ph-check-circle-duotone' },
  { status: 'changed', label: 'Inputs changed', icon: 'i-ph-pencil-simple-duotone' },
  { status: 'error', label: 'Cache check failed', icon: 'i-ph-warning-circle-duotone' },
].map(metric => ({ ...metric, count: rows.value.filter(row => row.cache.status === metric.status).length })).filter(metric => metric.count))
</script>

<template>
  <section class="task-details relative flex flex-col h-full w-full min-w-0 text-base" aria-label="Task details" :aria-busy="planLoading">
    <DisplayCloseButton class="absolute top-1.5 right-2 z-panel-content bg-glass" @click="$emit('close')" />
    <header class="self-start min-w-0 max-w-[calc(100%_-_3.5rem)] m2 mb0 p2 bg-glass border border-base rounded-lg flex flex-col gap2">
      <h2 class="flex items-center gap2 px2 pt1 m0 text-sm font-mono">
        <span class="i-ph-terminal-window-duotone shrink-0" />
        <TaskId :id="selected" class="truncate" />
      </h2>
      <div v-if="plan" class="flex flex-wrap items-center gap3 ml2 min-h-5 text-xs font-mono">
        <span class="flex items-center gap1"><i class="i-ph-stack-duotone op50" />{{ rows.length }} {{ rows.length === 1 ? 'task' : 'tasks' }}</span>
        <span v-for="metric in metrics" :key="metric.status" v-tooltip="metric.label" :aria-label="`${metric.count} · ${metric.label}`" class="flex items-center gap1">
          <i :class="metric.icon" class="op50" />{{ metric.count }}
        </span>
        <span v-if="cachedStepDurationsMs.length" v-tooltip="'Total duration of cached runs'" class="flex gap2 items-center">
          <span class="op30">|</span><i class="i-ph-clock-duotone op50" /><DisplayDuration :duration="cachedStepDurationsMs.reduce((a, b) => a + b)" />
        </span>
      </div>
      <div class="detail-tabs flex gap2">
        <button v-for="tab in views" :key="tab.name" class="w-40 min-w-0 flex items-center justify-center gap2 px2 py1 border border-base rounded-lg hover:bg-active" :class="{ 'text-primary': view === tab.name }" :aria-pressed="view === tab.name" @click="view = tab.name">
          <span :class="tab.icon" />{{ tab.name }}
        </button>
      </div>
    </header>
    <TaskDependencies v-if="view === 'Dependencies'" :selected :dependencies :dependents @select="$emit('select', $event)" />
    <VisualLoading v-else-if="planLoading" text="Loading plan…" />
    <div v-else-if="planError" role="alert" class="p3 text-red break-words">
      {{ planError }}
      <button class="btn-action mt2" @click="$emit('retry')">
        Retry
      </button>
    </div>
    <TaskFlow v-else-if="view === 'Task Flow' && rows.length" :key="selected" :rows="rows" :selected="selected" :dependencies="dependencies" :dependents="dependents" @select="$emit('select', $event)" />
    <div v-else-if="view === 'Commands' && plan?.plan[selected]" class="of-auto p4">
      <TaskSteps :task="plan.plan[selected]!" dependencies-hidden />
    </div>
    <p v-else class="p4 m0 text-sm op50 italic">
      No steps
    </p>
  </section>
</template>

<style scoped>
.task-details {
  container-type: inline-size;
}

@container (max-width: 28rem) {
  header {
    max-width: calc(100% - 1rem);
  }

  h2 {
    padding-right: 2rem;
  }

  .detail-tabs {
    gap: 0.25rem;
    overflow-x: auto;
  }

  .detail-tabs button {
    flex: 1 0 max-content;
    width: auto;
    padding-inline: 0.375rem;
    font-size: 0.875rem;
    white-space: nowrap;
  }

  .detail-tabs button > span {
    display: none;
  }
}
</style>
