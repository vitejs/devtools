<script setup lang="ts">
import type { PlanTask } from '../../shared/types'
import type { PlanRow } from '../utils/task-plan'
import DisplayCloseButton from '@vitejs/devtools-ui/components/Display/DisplayCloseButton.vue'
import DisplayDuration from '@vitejs/devtools-ui/components/Display/DisplayDuration.vue'
import FlowmapExpandable from '@vitejs/devtools-ui/components/Flowmap/FlowmapExpandable.vue'
import FlowmapNode from '@vitejs/devtools-ui/components/Flowmap/FlowmapNode.vue'
import { onClickOutside, useMediaQuery } from '@vueuse/core'
import { Pane, Splitpanes } from 'splitpanes'
import { computed, ref, shallowRef, useTemplateRef } from 'vue'
import { formatStepLabel, isCommand, programName } from '../utils/task-plan'
import CacheDetails from './CacheDetails.vue'
import CacheStatusBadge from './CacheStatusBadge.vue'
import TaskId from './TaskId.vue'
import TaskRelationMenu from './TaskRelationMenu.vue'
import TaskStepEvidence from './TaskStepEvidence.vue'
import TaskSteps from './TaskSteps.vue'
import 'splitpanes/dist/splitpanes.css'

const props = defineProps<{ rows: PlanRow[], selected: string, dependencies: string[], dependents: string[] }>()
defineEmits<{ select: [id: string] }>()

const stepsOpen = ref(true)
const tasksOpen = ref(true)
const expandedHitGroupIds = ref<string[]>([])
const stepListExpandedByTaskId = ref<Record<string, boolean>>({})
const inspection = shallowRef<{ id: string, task: PlanTask, stepIndex: number }>()
const targetStepIndex = computed(() => inspection.value?.id === props.selected ? inspection.value.stepIndex : -1)
const inspectionPanel = useTemplateRef<HTMLElement>('inspectionPanel')
const narrow = useMediaQuery('(max-width: 54rem)')
onClickOutside(inspectionPanel, () => {
  inspection.value = undefined
}, {
  ignore: ['.splitpanes__splitter', '.flowmap-node-inline'],
})

const target = computed(() => props.rows.find(row => row.id === props.selected))
const otherTasks = computed(() => props.rows.filter(row => row !== target.value))
const highlightedTaskIds = computed(() => {
  const ids = otherTasks.value.map(row => row.id)
  const selectedId = inspection.value?.id
  return new Set(selectedId === props.selected ? ids : ids.slice(0, ids.indexOf(selectedId ?? '') + 1))
})
const taskGroups = computed(() => {
  const groups: PlanRow[][] = []
  for (const row of otherTasks.value) {
    const last = groups.at(-1)
    if (row.cache.status === 'hit' && last?.[0]?.cache.status === 'hit')
      last.push(row)
    else
      groups.push([row])
  }
  return groups
})
function isStepListExpanded(row: PlanRow) {
  return stepListExpandedByTaskId.value[row.id] ?? (row.cache.status === 'error' || row.cache.status === 'changed')
}

function toggleHitGroup(id: string) {
  expandedHitGroupIds.value = expandedHitGroupIds.value.includes(id) ? expandedHitGroupIds.value.filter(item => item !== id) : [...expandedHitGroupIds.value, id]
}
</script>

<template>
  <div class="relative min-h-0 flex-1">
    <div class="h-full of-auto p4 overscroll-contain" role="group" aria-label="Task Flow">
      <template v-if="dependents.length">
        <div class="flex">
          <TaskRelationMenu :ids="dependents" direction="dependents" @select="$emit('select', $event)" />
        </div>
        <div class="border-flow-line border-dashed pl-10 border-r h-4 w-1px" />
      </template>
      <div class="flex w-max">
        <FlowmapNode :lines="{ bottom: !!(otherTasks.length || target?.task.steps.length) }" :active="!!inspection" class-node-outer="cursor-auto!">
          <template #content>
            <div class="flex items-center gap2 p2">
              <i class="i-ph-terminal-window-duotone" /><TaskId :id="selected" class="text-sm" />
            </div>
          </template>
        </FlowmapNode>
        <template v-if="dependencies.length">
          <div class="w-10 border-t border-base border-dashed mya" />
          <TaskRelationMenu :ids="dependencies" direction="dependencies" class="mya" @select="$emit('select', $event)" />
        </template>
      </div>

      <FlowmapExpandable v-if="otherTasks.length" v-model:expanded="tasksOpen" class="w-max" label="Planned tasks" :expandable="true" :show-tail="!!target?.task.steps.length" :active-start="!!inspection" :active-end="inspection?.id === selected">
        <template #node>
          <i class="i-ph-stack-duotone" />Planned tasks <span class="op50 text-xs">({{ otherTasks.length }})</span>
        </template>
        <template #container>
          <template v-for="(group, groupIndex) in taskGroups" :key="group[0]!.id">
            <div v-if="group.length > 1" class="pl10">
              <div class="flex gap2 items-center text-sm border-l py1 w-max" :class="highlightedTaskIds.has(group[0]!.id) ? 'border-flow-line-active' : 'border-flow-line'">
                <i class="w2 h2 border-4 [border-color:inherit] rounded-full ml--1 translate-x--0.5px" />
                <span class="op50">{{ group.length }} tasks hit cache</span>
                <DisplayDuration v-if="group.every(row => row.cachedDurationMs !== undefined)" :duration="group.reduce((sum, row) => sum + row.cachedDurationMs!, 0)" class="text-xs" />
                <button class="border border-base rounded-full px2 py-px text-sm op50 hover:op100" :aria-expanded="expandedHitGroupIds.includes(group[0]!.id)" @click="toggleHitGroup(group[0]!.id)">
                  {{ expandedHitGroupIds.includes(group[0]!.id) ? 'Hide' : 'Expand' }}
                </button>
              </div>
            </div>
            <template v-if="group.length === 1 || expandedHitGroupIds.includes(group[0]!.id)">
              <FlowmapNode v-for="(row, i) in group" :key="row.id" :active="highlightedTaskIds.has(row.id)" :lines="{ top: true }" class="pl6" :class="{ pt2: groupIndex > 0 || i > 0 }" class-node-inline="gap2 items-center">
                <template #inner>
                  <button class="px3 py1 flex items-center hover:bg-active" :aria-label="`Inspect ${row.id}`" :aria-pressed="inspection?.id === row.id" @click.stop="inspection = { id: row.id, task: row.task, stepIndex: 0 }">
                    <TaskId :id="row.id" class="text-sm" />
                  </button>
                </template>
                <template #inline-after>
                  <DisplayDuration v-if="row.cachedDurationMs !== undefined" :duration="row.cachedDurationMs" class="text-xs" />
                  <template v-if="row.commands.length > 1">
                    <span class="text-xs op50">{{ row.commands.length }} steps</span>
                    <button
                      class="border border-base rounded-full px2 py-px text-sm op50 hover:op100" :aria-expanded="isStepListExpanded(row)"
                      :aria-label="`${isStepListExpanded(row) ? 'Hide' : 'Expand'} steps for ${row.id}`" @click="stepListExpandedByTaskId[row.id] = !isStepListExpanded(row)"
                    >
                      {{ isStepListExpanded(row) ? 'Hide' : 'Expand' }}
                    </button>
                  </template>
                  <span v-if="!row.task.steps.length" class="text-xs op50">No steps</span>
                  <CacheStatusBadge v-else :status="row.cache.status" />
                </template>
                <template v-if="row.commands.length === 1 || isStepListExpanded(row)" #after>
                  <TaskStepEvidence
                    v-for="(command, index) in row.commands" :key="index" :step="command" :active="highlightedTaskIds.has(row.id)"
                    :terminal="!target?.task.steps.length && row === otherTasks.at(-1) && index === row.commands.length - 1"
                  >
                    <DisplayDuration v-if="row.commands.length > 1 && command.cache?.baseline" :duration="command.cache.baseline.durationMs" class="text-xs shrink-0" title="Duration of the cached run" />
                  </TaskStepEvidence>
                </template>
              </FlowmapNode>
            </template>
          </template>
        </template>
      </FlowmapExpandable>

      <FlowmapExpandable v-if="target?.task.steps.length" v-model:expanded="stepsOpen" class="w-max" label="Steps" :expandable="true" :show-tail="false" :active-start="inspection?.id === selected">
        <template #node>
          <i class="i-ph-terminal-window-duotone" />Steps <span class="op50 text-xs">({{ target.task.steps.length }})</span>
        </template>
        <template #container>
          <FlowmapNode v-for="(step, i) in target.task.steps" :key="i" :active="i <= targetStepIndex" :lines="{ top: true }" class="pl6" :class="{ pt2: i > 0 }" class-node-inline="gap2 items-center">
            <template #inner>
              <button class="px3 py1 hover:bg-active text-sm font-mono" :aria-label="`Inspect step ${i + 1}`" :aria-pressed="targetStepIndex === i" @click.stop="inspection = { id: selected, task: target.task, stepIndex: i }">
                <template v-if="isCommand(step)">
                  <span class="color-scale-medium">{{ programName(step.program) }}</span><template v-if="formatStepLabel(step) !== programName(step.program)">
                    <span class="op50">:</span>{{ formatStepLabel(step) }}
                  </template>
                </template>
                <TaskId v-else :id="step.expandedFrom" />
              </button>
            </template>
            <template v-if="isCommand(step)" #inline-after>
              <DisplayDuration v-if="step.cache?.baseline" :duration="step.cache.baseline.durationMs" class="text-xs" />
              <CacheStatusBadge :status="step.cache?.status" />
            </template>
            <template v-if="isCommand(step)" #after>
              <TaskStepEvidence :step="step" :active="i <= targetStepIndex" :terminal="i === target.task.steps.length - 1" />
            </template>
          </FlowmapNode>
        </template>
      </FlowmapExpandable>
      <p v-else-if="target" class="pl10 text-sm op50 italic">
        No steps
      </p>
    </div>
    <Splitpanes v-if="inspection" :horizontal="narrow" :keyboard-step="5" class="inspection-overlay absolute inset-4 z-10 !h-auto !w-auto pointer-events-none">
      <Pane :size="45" :min-size="10" :max-size="90" />
      <Pane :size="55" :min-size="10" :max-size="90">
        <section ref="inspectionPanel" :key="inspection.id" aria-label="Task inspection" class="pointer-events-auto h-full min-w-0 min-h-0 flex flex-col border border-base rounded-lg bg-glass of-hidden">
          <header class="flex shrink-0 items-center gap2 border-b border-base pl4 p2">
            <TaskId :id="inspection.id" class="text-sm flex-1 break-all" />
            <DisplayCloseButton aria-label="Close task inspection" @click="inspection = undefined" />
          </header>
          <div v-if="inspection.task.steps.length > 1" role="group" aria-label="Task steps" class="mx3 mt2 flex shrink-0 self-start max-w-[calc(100%_-_1.5rem)] items-center gap-1 overflow-x-auto p0.5 bg-glass border border-base rounded-lg">
            <button
              v-for="(step, index) in inspection.task.steps" :key="index" type="button"
              class="flex shrink-0 items-center gap2 whitespace-nowrap px3 py1 rounded-md text-sm"
              :class="inspection.stepIndex === index ? 'bg-active font-600' : 'op60 hover:op100'"
              :aria-pressed="inspection.stepIndex === index" @click="inspection = { ...inspection, stepIndex: index }"
            >
              <span class="text-xs op50">{{ index + 1 }}</span>
              <span class="font-mono">{{ isCommand(step) ? formatStepLabel(step) : step.expandedFrom }}</span>
              <CacheDetails v-if="isCommand(step)" :cache="step.cache || { status: 'unavailable' }" mode="summary" />
            </button>
          </div>
          <div :key="inspection.stepIndex" class="of-auto overscroll-contain p3">
            <TaskSteps :task="inspection.task" :step-index="inspection.task.steps.length > 1 ? inspection.stepIndex : undefined" @select="$emit('select', $event)" />
          </div>
        </section>
      </Pane>
    </Splitpanes>
  </div>
</template>

<style scoped>
.inspection-overlay :deep(.splitpanes__pane) {
  transition: none;
}
.inspection-overlay :deep(.splitpanes__splitter) {
  position: relative;
  z-index: 1;
  pointer-events: auto;
  flex: 0 0 0;
  min-width: 0;
  min-height: 0;
}
.inspection-overlay :deep(.splitpanes__splitter::before),
.inspection-overlay :deep(.splitpanes__splitter::after) {
  content: '';
  position: absolute;
}
.inspection-overlay :deep(.splitpanes__splitter::before) {
  inset: 0 -5px;
}
.inspection-overlay :deep(.splitpanes__splitter::after) {
  --uno: bg-current opacity-20 rounded-full;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 40px;
}
.inspection-overlay :deep(.splitpanes__splitter:focus-visible::after) {
  outline: 2px solid currentColor;
}
.inspection-overlay.splitpanes--horizontal :deep(.splitpanes__splitter::before) {
  inset: -5px 0;
}
.inspection-overlay.splitpanes--horizontal :deep(.splitpanes__splitter::after) {
  width: 40px;
  height: 8px;
}
</style>
