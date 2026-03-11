<script setup lang="ts">
import type { DevToolsLogEntry, DevToolsLogLevel } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { computed, onMounted, ref } from 'vue'
import { markLogsAsRead, useLogs } from '../state/logs'
import DockIcon from './DockIcon.vue'

const props = defineProps<{
  context: DocksContext
}>()

const logsState = useLogs(props.context)

const levelIcons: Record<DevToolsLogLevel, string> = {
  info: 'ph:info-duotone',
  warn: 'ph:warning-duotone',
  error: 'ph:x-circle-duotone',
  success: 'ph:check-circle-duotone',
  debug: 'ph:bug-duotone',
}

const levelColors: Record<DevToolsLogLevel, string> = {
  info: 'text-blue',
  warn: 'text-amber',
  error: 'text-red',
  success: 'text-green',
  debug: 'text-gray',
}

const levelBorderColors: Record<DevToolsLogLevel, string> = {
  info: 'border-l-blue',
  warn: 'border-l-amber',
  error: 'border-l-red',
  success: 'border-l-green',
  debug: 'border-l-gray',
}

const search = ref('')
const selectedId = ref<string | null>(null)
const activeFilters = ref<Set<DevToolsLogLevel>>(new Set())
const activeLabelFilters = ref<Set<string>>(new Set())

function toggleFilter(level: DevToolsLogLevel) {
  const filters = activeFilters.value
  if (filters.has(level))
    filters.delete(level)
  else
    filters.add(level)
}

function toggleLabelFilter(label: string) {
  const filters = activeLabelFilters.value
  if (filters.has(label))
    filters.delete(label)
  else
    filters.add(label)
}

const allLabels = computed(() => {
  const labels = new Set<string>()
  for (const entry of logsState.entries) {
    if (entry.labels) {
      for (const label of entry.labels)
        labels.add(label)
    }
  }
  return Array.from(labels).sort()
})

const filteredEntries = computed(() => {
  let entries = logsState.entries
  if (activeFilters.value.size > 0)
    entries = entries.filter(e => activeFilters.value.has(e.level))
  if (activeLabelFilters.value.size > 0)
    entries = entries.filter(e => e.labels?.some(l => activeLabelFilters.value.has(l)))
  if (search.value) {
    const q = search.value.toLowerCase()
    entries = entries.filter(e =>
      e.message.toLowerCase().includes(q)
      || e.description?.toLowerCase().includes(q)
      || e.source?.toLowerCase().includes(q)
      || e.category?.toLowerCase().includes(q)
      || e.labels?.some(l => l.toLowerCase().includes(q)),
    )
  }
  return entries.toReversed()
})

const selectedEntry = computed(() => {
  if (!selectedId.value)
    return null
  return logsState.entries.find(e => e.id === selectedId.value) ?? null
})

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString()
}

async function openFile(entry: DevToolsLogEntry) {
  if (!entry.filePosition)
    return
  const { file, line, column } = entry.filePosition
  let path = file
  if (line)
    path += `:${line}`
  if (column)
    path += `:${column}`
  await props.context.rpc.call('vite:core:open-in-editor', path)
}

async function runAutofix(entry: DevToolsLogEntry) {
  await props.context.rpc.call('devtoolskit:internal:logs:autofix', entry.id)
}

async function clearAll() {
  await props.context.rpc.call('devtoolskit:internal:logs:clear')
  selectedId.value = null
}

async function removeEntry(id: string) {
  await props.context.rpc.call('devtoolskit:internal:logs:remove', id)
  if (selectedId.value === id)
    selectedId.value = null
}

onMounted(() => {
  markLogsAsRead()
})

const allLevels: DevToolsLogLevel[] = ['error', 'warn', 'info', 'success', 'debug']
</script>

<template>
  <div class="w-full h-full grid grid-rows-[max-content_1fr]">
    <!-- Toolbar -->
    <div class="border-base border-b flex flex-wrap items-center gap-1 px-2 py-1">
      <button
        v-for="level of allLevels"
        :key="level"
        class="px-1.5 py-0.5 rounded text-xs flex items-center gap-0.5 hover:bg-active transition"
        :class="[
          activeFilters.size === 0 || activeFilters.has(level) ? levelColors[level] : 'op30',
        ]"
        @click="toggleFilter(level)"
      >
        <DockIcon :icon="levelIcons[level]" class="w-3.5 h-3.5" />
        <span class="capitalize">{{ level }}</span>
      </button>
      <div v-if="allLabels.length > 0" class="border-l border-base h-4 mx-0.5" />
      <button
        v-for="label of allLabels"
        :key="label"
        class="px-1.5 py-0.5 rounded text-xs hover:bg-active transition"
        :class="[
          activeLabelFilters.size === 0 || activeLabelFilters.has(label) ? 'text-purple bg-purple/10' : 'op30',
        ]"
        @click="toggleLabelFilter(label)"
      >
        {{ label }}
      </button>
      <div class="flex-1" />
      <input
        v-model="search"
        type="text"
        placeholder="Filter..."
        class="bg-transparent border border-base rounded px-2 py-0.5 text-xs w-40 outline-none focus:border-purple"
      >
      <button
        class="text-xs op50 hover:op100 px-1.5 py-0.5 hover:bg-active rounded transition"
        @click="clearAll"
      >
        Clear
      </button>
    </div>

    <!-- Content -->
    <div class="h-full of-hidden" :class="selectedEntry ? 'grid grid-cols-[1fr_1fr]' : ''">
      <!-- Log list -->
      <div class="h-full of-y-auto">
        <div v-if="filteredEntries.length === 0" class="flex items-center justify-center h-full op50 text-sm">
          No logs
        </div>
        <div
          v-for="entry of filteredEntries"
          :key="entry.id"
          class="w-full text-left px-3 py-2 border-b border-base hover:bg-active flex items-start gap-2 transition border-l-2 text-sm group cursor-pointer"
          :class="[
            levelBorderColors[entry.level],
            selectedId === entry.id ? 'bg-active' : '',
          ]"
          @click="selectedId = selectedId === entry.id ? null : entry.id"
        >
          <DockIcon
            v-if="entry.status !== 'loading'"
            :icon="levelIcons[entry.level]"
            class="w-4 h-4 flex-none mt-0.5"
            :class="levelColors[entry.level]"
          />
          <div
            v-else
            class="w-4 h-4 flex-none mt-0.5 border-2 border-current border-t-transparent rounded-full animate-spin op50"
          />
          <div class="flex-1 min-w-0">
            <div class="truncate font-medium" :class="entry.status === 'loading' ? 'op60' : ''">
              {{ entry.message }}
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span v-if="entry.source" class="text-xs op50">{{ entry.source }}</span>
              <span v-if="entry.category" class="text-xs bg-gray/10 px-1 rounded">{{ entry.category }}</span>
              <span
                v-for="label of entry.labels"
                :key="label"
                class="text-xs bg-purple/10 text-purple px-1 rounded"
              >{{ label }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 flex-none">
            <span class="text-xs op40">{{ formatTime(entry.timestamp) }}</span>
            <button
              class="op0 group-hover:op50 hover:op100! p-0.5 rounded hover:bg-active"
              title="Dismiss"
              @click.stop="removeEntry(entry.id)"
            >
              <DockIcon icon="ph:x" class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <!-- Detail panel -->
      <div v-if="selectedEntry" class="h-full of-y-auto border-l border-base p-4">
        <div class="flex items-start gap-2 mb-3">
          <DockIcon
            v-if="selectedEntry.status !== 'loading'"
            :icon="levelIcons[selectedEntry.level]"
            class="w-5 h-5 flex-none mt-0.5"
            :class="levelColors[selectedEntry.level]"
          />
          <div
            v-else
            class="w-5 h-5 flex-none mt-0.5 border-2 border-current border-t-transparent rounded-full animate-spin op50"
          />
          <div class="flex-1">
            <div class="font-medium text-base" :class="selectedEntry.status === 'loading' ? 'op60' : ''">
              {{ selectedEntry.message }}
            </div>
            <div v-if="selectedEntry.source" class="text-xs op50 mt-0.5">
              {{ selectedEntry.source }}
            </div>
          </div>
          <button class="op50 hover:op100 p-1" title="Close detail" @click="selectedId = null">
            <DockIcon icon="ph:x" class="w-4 h-4" />
          </button>
        </div>

        <div v-if="selectedEntry.description" class="text-sm op80 mb-3 whitespace-pre-wrap">
          {{ selectedEntry.description }}
        </div>

        <div v-if="selectedEntry.category || (selectedEntry.labels && selectedEntry.labels.length)" class="flex flex-wrap gap-1 mb-3">
          <span v-if="selectedEntry.category" class="text-xs bg-gray/15 px-1.5 py-0.5 rounded">{{ selectedEntry.category }}</span>
          <span
            v-for="label of selectedEntry.labels"
            :key="label"
            class="text-xs bg-purple/10 text-purple px-1.5 py-0.5 rounded"
          >{{ label }}</span>
        </div>

        <!-- File position -->
        <button
          v-if="selectedEntry.filePosition"
          class="flex items-center gap-1.5 text-sm text-blue hover:underline mb-3"
          @click="openFile(selectedEntry!)"
        >
          <DockIcon icon="ph:file-code-duotone" class="w-4 h-4" />
          <span>{{ selectedEntry.filePosition.file }}<template v-if="selectedEntry.filePosition.line">:{{ selectedEntry.filePosition.line }}</template></span>
        </button>

        <!-- Element position -->
        <div v-if="selectedEntry.elementPosition" class="text-sm mb-3 bg-gray/5 rounded p-2">
          <div class="op50 text-xs mb-1">
            Element
          </div>
          <div v-if="selectedEntry.elementPosition.selector" class="font-mono text-xs">
            {{ selectedEntry.elementPosition.selector }}
          </div>
          <div v-if="selectedEntry.elementPosition.description" class="text-xs op70 mt-1">
            {{ selectedEntry.elementPosition.description }}
          </div>
        </div>

        <!-- Stacktrace -->
        <div v-if="selectedEntry.stacktrace" class="mb-3">
          <div class="op50 text-xs mb-1">
            Stack Trace
          </div>
          <pre class="text-xs bg-gray/5 rounded p-2 of-x-auto whitespace-pre-wrap font-mono">{{ selectedEntry.stacktrace }}</pre>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <!-- Autofix -->
          <button
            v-if="selectedEntry.autofix"
            class="flex items-center gap-1.5 text-sm bg-purple/10 text-purple px-3 py-1.5 rounded hover:bg-purple/20 transition"
            @click="runAutofix(selectedEntry!)"
          >
            <DockIcon icon="ph:wrench-duotone" class="w-4 h-4" />
            Autofix
          </button>
          <!-- Dismiss -->
          <button
            class="flex items-center gap-1.5 text-sm op50 hover:op100 px-3 py-1.5 rounded hover:bg-active transition"
            @click="removeEntry(selectedEntry!.id)"
          >
            <DockIcon icon="ph:trash-duotone" class="w-4 h-4" />
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
