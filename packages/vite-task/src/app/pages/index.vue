<script setup lang="ts">
import type { RunPlan, TaskGraph } from '../../shared/types'
import DataSearchPanel from '@vitejs/devtools-ui/components/Data/DataSearchPanel.vue'
import DisplayIconButton from '@vitejs/devtools-ui/components/Display/DisplayIconButton.vue'
import VisualLoading from '@vitejs/devtools-ui/components/Visual/VisualLoading.vue'
import { onKeyDown } from '@vueuse/core'
import { computed, onMounted, provide, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from '#app/composables/router'
import TaskDetails from '../components/TaskDetails.vue'
import TaskGraphView from '../components/TaskGraphView.vue'
import TaskId from '../components/TaskId.vue'
import { useRpc } from '../composables/rpc'
import { getTaskPackageKey, isTaskInGraphKey } from '../utils/task-plan'

const rpc = useRpc()
const graph = shallowRef<TaskGraph>()
provide(isTaskInGraphKey, (id: string) => !!graph.value?.tasks[id])
provide(getTaskPackageKey, id => graph.value?.tasks[id]?.package)
const plan = shallowRef<RunPlan>()
const route = useRoute()
const router = useRouter()
const selected = computed(() => typeof route.query.task === 'string' ? route.query.task : '')
const graphLoading = ref(false)
const planLoading = ref(false)
const graphError = ref('')
const planError = ref('')
const unsupportedVersion = ref(false)
const filters = ref<{ search: string, selected: string[] | null }>({ search: '', selected: null })
const isolatedTasksVisible = ref(false)
const taskEntries = computed(() => Object.entries(graph.value?.tasks || {}))
// DataSearchPanel requires icon and always renders its element; hidden removes the empty flex slot.
const taskRules = computed(() => [...new Set(taskEntries.value.map(([, task]) => task.name))].sort().map(name => ({ name, match: /.*/, icon: 'hidden' })))
const matchedTasks = computed(() => taskEntries.value.filter(([id, task]) =>
  (!filters.value.selected || filters.value.selected.includes(task.name))
  && `${id} ${graph.value?.packages[task.package]?.name || ''}`.toLowerCase().includes(filters.value.search.toLowerCase()),
))
const matchedIds = computed(() => new Set(matchedTasks.value.map(([id]) => id)))
const connectedTaskIds = computed(() => new Set(taskEntries.value.flatMap(([id, task]) => task.dependsOn?.length ? [id, ...task.dependsOn] : [])))
const isolatedCount = computed(() => taskEntries.value.filter(([id]) => !connectedTaskIds.value.has(id)).length)
const visibleGraph = computed<TaskGraph | undefined>((previous) => {
  if (!graph.value)
    return undefined
  const seeds = matchedTasks.value.map(([id]) => id).filter(id => isolatedTasksVisible.value || connectedTaskIds.value.has(id))
  const reachable: Set<string>[] = []
  const dependents = new Map<string, string[]>()
  for (const [id, task] of taskEntries.value) {
    for (const dep of task.dependsOn || [])
      dependents.set(dep, [...(dependents.get(dep) || []), id])
  }
  // Only nodes reachable in both directions bridge matching tasks.
  for (const upstream of [true, false]) {
    const visited = new Set(seeds)
    const queue = [...seeds]
    for (let i = 0; i < queue.length; i++) {
      const neighbors = upstream ? graph.value.tasks[queue[i]!]?.dependsOn : dependents.get(queue[i]!)
      for (const id of neighbors || []) {
        if (!visited.has(id) && graph.value.tasks[id]) {
          visited.add(id)
          queue.push(id)
        }
      }
    }
    reachable.push(visited)
  }
  const included = new Set([...reachable[0]!].filter(id => reachable[1]!.has(id)))
  const tasks = taskEntries.value.filter(([id]) => included.has(id))
  const previousIds = Object.keys(previous?.tasks || {})
  if (previous && previousIds.length === tasks.length && tasks.every(([id]) => Object.hasOwn(previous.tasks, id)))
    return previous
  return { ...graph.value, tasks: Object.fromEntries(tasks) }
})
const intermediateTaskCount = computed(() => Object.keys(visibleGraph.value?.tasks || {}).filter(id => !matchedIds.value.has(id)).length)
const view = ref<'list' | 'graph'>('list')
const sortedTasks = computed(() => [...matchedTasks.value].sort(([, a], [, b]) => a.package.localeCompare(b.package) || a.name.localeCompare(b.name)))
let planRequestVersion = 0

async function loadPlan(id: string) {
  const requestVersion = ++planRequestVersion
  plan.value = undefined
  planError.value = ''
  planLoading.value = true
  try {
    const result = await rpc.value.call('vite-task:get-plan', { task: id, verbose: true })
    if (requestVersion !== planRequestVersion)
      return
    if (result === 'unsupported-version')
      unsupportedVersion.value = true
    else
      plan.value = result
  }
  catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')
      return
    if (requestVersion === planRequestVersion)
      planError.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    if (requestVersion === planRequestVersion)
      planLoading.value = false
  }
}

async function refresh() {
  if (graphLoading.value)
    return
  graphLoading.value = true
  graphError.value = ''
  try {
    const result = await rpc.value.call('vite-task:get-graph')
    ++planRequestVersion
    plan.value = undefined
    planLoading.value = false
    planError.value = ''
    unsupportedVersion.value = result === 'unsupported-version'
    if (result === 'unsupported-version')
      return
    graph.value = result
    if (selected.value && graph.value.tasks[selected.value])
      await loadPlan(selected.value)
    else
      closeTask()
  }
  catch (error) {
    graphError.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    graphLoading.value = false
  }
}

function selectTask(id: string) {
  router.replace({ query: { ...route.query, task: id } })
}

function closeTask() {
  router.replace({ query: { ...route.query, task: undefined } })
}

function changeView(mode: 'list' | 'graph') {
  view.value = mode
}

watch(selected, (id) => {
  if (id && graph.value) {
    loadPlan(id)
  }
  else {
    ++planRequestVersion
    planLoading.value = false
  }
})
onKeyDown('Escape', (e) => {
  e.preventDefault()

  if (!e.isTrusted || e.repeat)
    return

  if (selected.value)
    closeTask()
})

onMounted(refresh)
</script>

<template>
  <div v-if="unsupportedVersion" role="status" class="h-full grid place-items-center px4 text-center text-sm">
    <span class="op65">To use Vite Task DevTools, update Vite+ to v1.6.0 or later.</span>
  </div>
  <div v-else class="text-sm relative" :class="view === 'graph' ? 'h-full flex flex-col max-h-screen of-hidden' : ''">
    <div class="z-panel-nav p4" :class="view === 'list' ? 'sticky left-4 right-4 top-4' : 'shrink-0'">
      <DataSearchPanel v-model="filters" :rules="taskRules">
        <template #search-end>
          <div class="h10 mr2 flex items-center">
            <DisplayIconButton v-tooltip="'Refresh tasks'" title="Refresh tasks" :class-icon="graphLoading ? 'i-ph-arrow-clockwise-duotone animate-spin' : 'i-ph-arrow-clockwise-duotone'" :disabled="graphLoading" @click="refresh" />
          </div>
        </template>
        <div class="flex flex-wrap gap2 items-center p2 border-t border-base">
          <span class="op50 pl2 text-sm">View as</span>
          <button v-for="mode in (['list', 'graph'] as const)" :key="mode" class="btn-action" :class="view === mode ? 'bg-active' : 'grayscale op50'" :aria-pressed="view === mode" @click="changeView(mode)">
            <span :class="mode === 'list' ? 'i-ph-list-bullets-duotone' : 'i-ph-graph-duotone'" />
            {{ mode === 'list' ? 'List' : 'Graph' }}
          </button>
          <label v-if="view === 'graph' && isolatedCount" class="flex items-center gap2 text-sm ml2">
            <input v-model="isolatedTasksVisible" type="checkbox">Show {{ isolatedCount }} isolated
          </label>
        </div>
      </DataSearchPanel>
    </div>
    <div v-if="graphError" role="alert" class="px3 py2 text-red border-b border-base flex items-center gap2">
      <span class="flex-1 break-words">{{ graphError }}</span>
      <button class="btn-action" :disabled="graphLoading" @click="refresh">
        Retry
      </button>
    </div>
    <VisualLoading v-if="graphLoading && !graph" text="Loading tasks…" />
    <section v-else-if="graph && view === 'list'" class="p4 pb16" aria-label="Tasks">
      <div v-for="[id, task] in sortedTasks" :key="id" class="flex pb2">
        <button class="hover:bg-active flex items-center gap2 px2 py1 w-full border border-base rounded text-left" :class="selected === id ? 'bg-active' : ''" :title="id" :aria-pressed="selected === id" :disabled="graphLoading" @click="selectTask(id)">
          <span class="i-ph-terminal-window-duotone op-fade shrink-0" />
          <TaskId :id="id" class="truncate" />
          <span v-if="task.dependsOn?.length" v-tooltip="`Depends on ${task.dependsOn.length} ${task.dependsOn.length === 1 ? 'task' : 'tasks'}`" class="ml-auto text-xs op-fade flex items-center gap1"><span class="i-ph-graph-duotone" />{{ task.dependsOn.length }}</span>
        </button>
      </div>
      <div v-if="!sortedTasks.length" class="w-full h-48 flex items-center justify-center text-sm op50 italic">
        <p>No tasks</p>
      </div>
    </section>
    <div v-else-if="visibleGraph" class="flex-1 min-h-0">
      <TaskGraphView :graph="visibleGraph" :matched="matchedIds" :selected="selected" :disabled="graphLoading" @select="selectTask" />
    </div>
    <div v-if="graph" class="fixed bottom-4 py-1 px-2 bg-glass left-1/2 translate-x--1/2 border border-base rounded-full text-center text-xs">
      <span class="op50">{{ view === 'graph' ? Object.keys(visibleGraph?.tasks || {}).length : matchedTasks.length }} of {{ taskEntries.length }}<template v-if="view === 'graph' && intermediateTaskCount"> · {{ intermediateTaskCount }} bridges</template></span>
    </div>
    <div v-if="selected && graph" class="fixed inset-0 backdrop-blur-8 backdrop-brightness-95 z-panel-content" @click.self="closeTask">
      <div class="fixed right-0 bottom-0 top-3 left-3 sm:top-20 sm:left-20 z-panel-content bg-glass border-l border-t border-base rounded-tl-xl">
        <TaskDetails :graph-tasks="graph.tasks" :selected="selected" :plan="plan" :plan-loading="planLoading" :plan-error="planError" @select="selectTask" @close="closeTask" @retry="loadPlan(selected)" />
      </div>
    </div>
  </div>
</template>
