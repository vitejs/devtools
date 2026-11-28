<script setup lang="ts">
import type { RunPlan, TaskGraph } from '../../shared/types'
import type { TaskNameSelection } from '../utils/task-name-selection'
import DataSearchPanel from '@vitejs/devtools-ui/components/Data/DataSearchPanel.vue'
import DisplayIconButton from '@vitejs/devtools-ui/components/Display/DisplayIconButton.vue'
import VisualLoading from '@vitejs/devtools-ui/components/Visual/VisualLoading.vue'
import { onKeyDown } from '@vueuse/core'
import { computed, onMounted, provide, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from '#app/composables/router'
import { MIN_VITE_PLUS_VERSION } from '../../shared/version'
import TaskDetails from '../components/TaskDetails.vue'
import TaskGraphView from '../components/TaskGraphView.vue'
import TaskNameFilter from '../components/TaskNameFilter.vue'
import { useRpc } from '../composables/rpc'
import { isTaskNameSelected } from '../utils/task-name-selection'
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
const filters = ref({ search: '' })
const nameSelection = ref<TaskNameSelection>({ mode: 'exclude', names: new Set() })
const isolatedTasksVisible = ref(false)
const taskEntries = computed(() => Object.entries(graph.value?.tasks || {}))
const taskNames = computed(() => [...new Set(taskEntries.value.map(([, task]) => task.name))].sort())
const matchedTasks = computed(() => taskEntries.value.filter(([id, task]) =>
  isTaskNameSelected(nameSelection.value, task.name)
  && `${id} ${graph.value?.packages[task.package]?.name || ''}`.toLowerCase().includes(filters.value.search.toLowerCase()),
))
const matchedIds = computed(() => new Set(matchedTasks.value.map(([id]) => id)))
const connectedTaskIds = computed(() => new Set(taskEntries.value.flatMap(([id, task]) => task.dependsOn?.length ? [id, ...task.dependsOn] : [])))
const isolatedCount = computed(() => matchedTasks.value.filter(([id]) => !connectedTaskIds.value.has(id)).length)
const dependentsByTask = computed(() => {
  const dependents = new Map<string, string[]>()
  for (const [id, task] of taskEntries.value) {
    for (const dep of task.dependsOn || []) {
      const ids = dependents.get(dep)
      if (ids)
        ids.push(id)
      else
        dependents.set(dep, [id])
    }
  }
  return dependents
})
const visibleGraph = computed<TaskGraph | undefined>((previous) => {
  if (!graph.value)
    return undefined
  const seeds = matchedTasks.value.map(([id]) => id).filter(id => isolatedTasksVisible.value || connectedTaskIds.value.has(id))
  const reachable: Set<string>[] = []
  // Only nodes reachable in both directions bridge matching tasks.
  for (const upstream of [true, false]) {
    const visited = new Set(seeds)
    const queue = [...seeds]
    for (let i = 0; i < queue.length; i++) {
      const neighbors = upstream ? graph.value.tasks[queue[i]!]?.dependsOn : dependentsByTask.value.get(queue[i]!)
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
  if (previous && Object.keys(previous.tasks).length === tasks.length && tasks.every(([id, task]) => {
    const prior = previous.tasks[id]
    if (prior === task)
      return true
    if (!prior || prior.name !== task.name || prior.package !== task.package)
      return false
    const oldEdges = (prior.dependsOn ?? []).filter(dep => included.has(dep))
    const newEdges = (task.dependsOn ?? []).filter(dep => included.has(dep))
    return oldEdges.length === newEdges.length && oldEdges.every((dep, index) => dep === newEdges[index])
  })) {
    return previous
  }
  return { ...graph.value, tasks: Object.fromEntries(tasks) }
})
const intermediateTaskCount = computed(() => Object.keys(visibleGraph.value?.tasks || {}).filter(id => !matchedIds.value.has(id)).length)
const view = ref<'list' | 'graph'>('list')
const packageGroups = computed(() => {
  const groups = new Map<string, typeof matchedTasks.value>()
  for (const entry of matchedTasks.value) {
    const path = entry[1].package
    const tasks = groups.get(path)
    if (tasks)
      tasks.push(entry)
    else
      groups.set(path, [entry])
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([path, tasks]) => ({
    path,
    label: path === '.' ? 'Workspace root' : graph.value?.packages[path]?.name || path,
    tasks: tasks.sort(([, a], [, b]) => a.name.localeCompare(b.name)),
  }))
})
const collapsedPackages = ref(new Set<string>())
const collapsedSearchResults = ref(new Set<string>())
watch(() => filters.value.search, () => collapsedSearchResults.value.clear())
const collapsed = computed(() => filters.value.search ? collapsedSearchResults.value : collapsedPackages.value)

function togglePackage(path: string) {
  if (collapsed.value.has(path))
    collapsed.value.delete(path)
  else
    collapsed.value.add(path)
}

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
    <span class="op65">To use Vite Task DevTools, update Vite+ to v{{ MIN_VITE_PLUS_VERSION }} or later.</span>
  </div>
  <div v-else class="text-sm relative" :class="view === 'graph' ? 'h-full flex flex-col max-h-screen of-hidden' : ''">
    <div class="z-panel-nav p4" :class="view === 'list' ? 'sticky left-4 right-4 top-4' : 'shrink-0'">
      <DataSearchPanel v-model="filters" :rules="[]">
        <template #search-end>
          <div class="h10 mr2 flex items-center gap2">
            <TaskNameFilter v-model="nameSelection" :names="taskNames" />
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
      <details v-for="group in packageGroups" :key="group.path" :open="!collapsed.has(group.path)" class="mb2">
        <summary class="cursor-default select-none flex gap-1 items-center px1 py1 rounded hover:bg-active" :title="group.path" @click.prevent="togglePackage(group.path)">
          <span class="i-ph-caret-right-duotone transition op50" :class="{ 'rotate-90': !collapsed.has(group.path) }" />
          <span class="op70 text-sm">{{ group.label }}</span>
          <span class="op40 text-xs font-mono">{{ group.tasks.length }}</span>
        </summary>
        <div class="flex flex-col gap2 pl4 pt2">
          <button v-for="[id, task] in group.tasks" :key="id" class="hover:bg-active flex items-center gap2 px2 py1 w-full border border-base rounded text-left" :class="selected === id ? 'bg-active' : ''" :title="id" :aria-pressed="selected === id" :disabled="graphLoading" @click="selectTask(id)">
            <span class="i-ph-terminal-window-duotone op-fade shrink-0" />
            <span class="font-mono truncate">{{ task.name }}</span>
            <span v-if="task.dependsOn?.length" v-tooltip="`Depends on ${task.dependsOn.length} ${task.dependsOn.length === 1 ? 'task' : 'tasks'}`" class="ml-auto text-xs op-fade flex items-center gap1"><span class="i-ph-graph-duotone" />{{ task.dependsOn.length }}</span>
          </button>
        </div>
      </details>
      <div v-if="!packageGroups.length" class="w-full h-48 flex items-center justify-center text-sm op50 italic">
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
        <TaskDetails :dependencies="graph.tasks[selected]?.dependsOn ?? []" :dependents="dependentsByTask.get(selected) ?? []" :selected="selected" :plan="plan" :plan-loading="planLoading" :plan-error="planError" @select="selectTask" @close="closeTask" @retry="loadPlan(selected)" />
      </div>
    </div>
  </div>
</template>
