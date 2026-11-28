<script setup lang="ts">
import type { GraphTask, TaskSource } from '../../shared/types'
import DisplayCloseButton from '@vitejs/devtools-ui/components/Display/DisplayCloseButton.vue'
import { reactive, shallowRef, watch } from 'vue'
import { useRpc } from '../composables/rpc'
import TaskId from './TaskId.vue'

interface SourceState {
  source?: TaskSource
  error?: string
  opening?: boolean
}

const props = defineProps<{ selected: string, task?: GraphTask }>()
defineEmits<{ close: [] }>()

const rpc = useRpc()
const sourceNames = { script: 'package.json script', config: 'Vite configuration', unknown: 'Unknown' }
const state = shallowRef<SourceState>({})
watch([() => props.selected, () => props.task], async ([id, task]) => {
  // Each graph refresh or selection owns its responses, including editor errors.
  const current = reactive<SourceState>({})
  state.value = current
  if (task)
    await refreshSource(current, id, task)
}, { immediate: true })

async function refreshSource(current: SourceState, id: string, task: GraphTask) {
  try {
    current.source = await rpc.value.call('vite-task:get-task-source', id, task.sourceKind ?? 'unknown', task.command)
  }
  catch (error) {
    current.error ??= error instanceof Error ? error.message : String(error)
  }
}

async function openSource() {
  const current = state.value
  const source = current.source
  const task = props.task
  if (!task || !source?.canOpen || source.kind === 'unknown' || current.opening)
    return
  const id = props.selected
  current.opening = true
  current.error = undefined
  try {
    await rpc.value.call('vite-task:open-task-source', id, source.kind, task.command)
  }
  catch (error) {
    current.error = error instanceof Error ? error.message : String(error)
    if (current === state.value)
      await refreshSource(current, id, task)
  }
  finally {
    current.opening = false
  }
}
</script>

<template>
  <div class="flex flex-wrap items-start gap-x-3 gap-y-1 px2">
    <div class="flex flex-col gap1 min-w-0">
      <h2 class="flex items-center gap2 m0 text-sm font-mono">
        <span class="i-ph-terminal-window-duotone shrink-0" />
        <TaskId :id="selected" class="truncate" />
      </h2>
      <div class="flex gap2 items-baseline text-sm">
        <span class="op60">Source</span>
        <span v-if="state.source">{{ sourceNames[state.source.kind] }}</span>
        <span v-else-if="task && !state.error">Loading…</span>
        <span v-else>Unknown</span>
      </div>
    </div>
    <div class="ml-auto flex items-center gap2">
      <button v-if="state.source?.canOpen && state.source.kind !== 'unknown'" type="button" class="btn-action" :disabled="state.opening" @click="openSource">
        <span class="i-ph-arrow-square-out-duotone" />
        {{ state.source.kind === 'script' ? 'Open script definition' : 'Open package config' }}
      </button>
      <DisplayCloseButton class="shrink-0" @click="$emit('close')" />
    </div>
  </div>
  <div v-if="state.error" role="alert" class="px2 text-sm text-red break-words">
    {{ state.error }}
  </div>
</template>
