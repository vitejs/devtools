<script setup lang="ts">
import type { DevToolsMessageEntry, DevToolsMessageEntryFrom, DevToolsMessageLevel } from '@vitejs/devtools-kit'
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { useClipboard, useTimeAgo, whenever } from '@vueuse/core'
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { markMessagesAsRead, useMessages } from '../../state/messages'
import FilterToggles from '../display/FilterToggles.vue'
import HashBadge from '../display/HashBadge.vue'
import MessageItem from '../message/MessageItem.vue'
import { fromEntries, getHashColorFromString, levels } from '../message/MessageItemConstants'

const props = defineProps<{
  context: DocksContext
}>()

function formatAbsoluteTime(ts: number): string {
  return new Date(ts).toLocaleTimeString()
}

type SortMode = 'newest' | 'oldest' | 'level'

const messagesState = useMessages(props.context)

const allLevels: DevToolsMessageLevel[] = Object.keys(levels) as DevToolsMessageLevel[]
const allSources: DevToolsMessageEntryFrom[] = Object.keys(fromEntries) as DevToolsMessageEntryFrom[]

const sortLabels: Record<SortMode, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  level: 'By severity',
}
const sortIcons: Record<SortMode, string> = {
  newest: 'i-ph:sort-descending-duotone',
  oldest: 'i-ph:sort-ascending-duotone',
  level: 'i-ph:warning-diamond-duotone',
}

const search = ref('')
const selectedId = ref<string | null>(null)
const activeFilters = ref<Set<DevToolsMessageLevel>>(new Set())
const activeLabelFilters = ref<Set<string>>(new Set())
const activeFromFilters = ref<Set<DevToolsMessageEntryFrom>>(new Set())
const activeCategories = ref<Set<string>>(new Set())
const sortBy = ref<SortMode>('newest')

const sortModes: SortMode[] = ['newest', 'oldest', 'level']

function cycleSortMode() {
  const idx = sortModes.indexOf(sortBy.value)!
  sortBy.value = sortModes[(idx + 1) % sortModes.length] as SortMode
}

const levelPriority: Record<DevToolsMessageLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  success: 3,
  debug: 4,
}

function toggleFilter(level: string) {
  const filters = activeFilters.value
  if (filters.has(level as DevToolsMessageLevel))
    filters.delete(level as DevToolsMessageLevel)
  else
    filters.add(level as DevToolsMessageLevel)
}

function toggleLabelFilter(label: string) {
  const filters = activeLabelFilters.value
  if (filters.has(label))
    filters.delete(label)
  else
    filters.add(label)
}

function toggleFrom(from: DevToolsMessageEntryFrom) {
  const s = activeFromFilters.value
  if (s.has(from))
    s.delete(from)
  else
    s.add(from)
}

function toggleCategory(category: string) {
  const c = activeCategories.value
  if (c.has(category))
    c.delete(category)
  else
    c.add(category)
}

const hasActiveFilter = computed(() => {
  return activeFilters.value.size > 0
    || activeLabelFilters.value.size > 0
    || activeFromFilters.value.size > 0
    || activeCategories.value.size > 0
    || search.value.length > 0
})

function resetFilters() {
  activeFilters.value.clear()
  activeLabelFilters.value.clear()
  activeFromFilters.value.clear()
  activeCategories.value.clear()
  search.value = ''
}

const allLabels = computed(() => {
  const labels = new Set<string>()
  for (const entry of messagesState.entries) {
    if (entry.labels) {
      for (const label of entry.labels)
        labels.add(label)
    }
  }
  return Array.from(labels).sort()
})

const allCategories = computed(() => {
  const cats = new Set<string>()
  for (const entry of messagesState.entries) {
    if (entry.category)
      cats.add(entry.category)
  }
  return Array.from(cats).sort()
})

const filteredEntries = computed(() => {
  let entries = messagesState.entries
  if (activeFilters.value.size > 0)
    entries = entries.filter(e => activeFilters.value.has(e.level))
  if (activeLabelFilters.value.size > 0)
    entries = entries.filter(e => e.labels?.some(l => activeLabelFilters.value.has(l)))
  if (activeFromFilters.value.size > 0)
    entries = entries.filter(e => activeFromFilters.value.has(e.from as DevToolsMessageEntryFrom))
  if (activeCategories.value.size > 0)
    entries = entries.filter(e => e.category && activeCategories.value.has(e.category))
  if (search.value) {
    const q = search.value.toLowerCase()
    entries = entries.filter(e =>
      e.message.toLowerCase().includes(q)
      || e.description?.toLowerCase().includes(q)
      || e.from?.toLowerCase().includes(q)
      || e.category?.toLowerCase().includes(q)
      || e.labels?.some(l => l.toLowerCase().includes(q)),
    )
  }

  // Sort
  if (sortBy.value === 'oldest')
    return [...entries]
  if (sortBy.value === 'level')
    return entries.toSorted((a, b) => levelPriority[a.level] - levelPriority[b.level])
  return entries.toReversed()
})

const selectedEntry = computed(() => {
  if (!selectedId.value)
    return null
  return messagesState.entries.find(e => e.id === selectedId.value) ?? null
})

watch(selectedEntry, async (entry) => {
  if (!entry?.autoDelete)
    return

  await props.context.rpc.call('devtoolskit:internal:messages:update', entry.id, { autoDelete: 0 })
})

const messageListEl = useTemplateRef('messageListEl')

whenever(() => messagesState.pendingSelectId, async (id) => {
  if (!id)
    return

  messagesState.pendingSelectId = null
  selectedId.value = id

  await nextTick()
  messageListEl.value?.querySelector<HTMLElement>('[data-selected]')
    ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}, { immediate: true })

const selectedTimeAgo = useTimeAgo(computed(() => selectedEntry.value?.timestamp ?? Date.now()))
const { copy: copyStacktrace, copied: stacktraceCopied } = useClipboard()

async function openFile(entry: DevToolsMessageEntry) {
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

async function clearAll() {
  await props.context.rpc.call('devtoolskit:internal:messages:clear')
  selectedId.value = null
}

async function removeEntry(id: string) {
  await props.context.rpc.call('devtoolskit:internal:messages:remove', id)
  if (selectedId.value === id)
    selectedId.value = null
}

async function dismissFiltered() {
  const ids = filteredEntries.value.map(e => e.id)
  for (const id of ids)
    await props.context.rpc.call('devtoolskit:internal:messages:remove', id)
  selectedId.value = null
}

onMounted(() => {
  markMessagesAsRead()
})
</script>

<template>
  <div class="w-full h-full grid grid-rows-[max-content_1fr]">
    <!-- Toolbar -->
    <div class="border-base border-b p3 flex flex-col gap-2">
      <!-- Row 1: Search + sort + actions -->
      <div class="flex items-center gap-1">
        <input
          v-model="search"
          type="text"
          placeholder="Search messages..."
          class="bg-transparent border border-base rounded px-2 py-0.5 text-xs w-48 outline-none focus:border-purple"
        >
        <button
          class="flex items-center gap-0.5 op50 hover:op100 p-1 rounded hover:bg-active transition"
          :title="sortLabels[sortBy]"
          @click="cycleSortMode"
        >
          <div :class="sortIcons[sortBy]" class="w-4 h-4" />
        </button>
        <div class="flex-1" />
        <span v-if="filteredEntries.length !== messagesState.entries.length" class="text-xs op40">
          {{ filteredEntries.length }}/{{ messagesState.entries.length }}
        </span>
        <button
          v-if="hasActiveFilter"
          class="text-xs op50 hover:op100 px-1.5 py-0.5 hover:bg-active rounded transition flex items-center gap-0.5"
          title="Reset all filters"
          @click="resetFilters"
        >
          <div class="i-ph:funnel-x-duotone w-3.5 h-3.5" />
          Reset Filters
        </button>
        <div v-if="hasActiveFilter" class="border-l border-base h-4 mx-0.5" />
        <button
          v-if="hasActiveFilter && filteredEntries.length > 0"
          class="text-xs op50 hover:op100 px-1.5 py-0.5 hover:bg-active rounded transition flex items-center gap-0.5"
          title="Dismiss all matching the current filter"
          @click="dismissFiltered"
        >
          <div class="i-ph:trash-duotone w-3.5 h-3.5" />
          Dismiss filtered
        </button>
        <button
          v-if="!hasActiveFilter && messagesState.entries.length > 0"
          class="text-xs op50 hover:op100 px-1.5 py-0.5 hover:bg-active rounded transition flex items-center gap-0.5"
          title="Dismiss all messages"
          @click="clearAll"
        >
          <div class="i-ph:trash-duotone w-3.5 h-3.5" />
          Dismiss all
        </button>
      </div>

      <!-- Row 2: Level + source + category + label filters -->
      <div class="flex flex-wrap items-center gap-1">
        <FilterToggles
          label="Level"
          :items="allLevels"
          :active="(activeFilters as Set<string>)"
          :styles="levels"
          @toggle="toggleFilter"
        />

        <div class="border-l border-base h-4 mx-0.5" />

        <FilterToggles
          label="From"
          :items="allSources"
          :active="(activeFromFilters as Set<DevToolsMessageEntryFrom>)"
          :styles="fromEntries"
          @toggle="(toggleFrom as (item: string) => void)"
        />

        <template v-if="allCategories.length > 0">
          <div class="border-l border-base h-4 mx-1" />
          <FilterToggles
            label="Category"
            :items="allCategories"
            :active="(activeCategories as Set<string>)"
            :hash-color="getHashColorFromString"
            @toggle="toggleCategory"
          />
        </template>

        <template v-if="allLabels.length > 0">
          <div class="border-l border-base h-4 mx-1" />
          <FilterToggles
            label="Labels"
            :items="allLabels"
            :active="(activeLabelFilters as Set<string>)"
            :hash-color="getHashColorFromString"
            @toggle="toggleLabelFilter"
          />
        </template>
      </div>
    </div>

    <!-- Content -->
    <div class="h-full of-hidden" :class="selectedEntry ? 'grid grid-cols-[1fr_1fr]' : ''">
      <!-- Message list -->
      <div ref="messageListEl" class="h-full of-y-auto">
        <div v-if="filteredEntries.length === 0" class="flex items-center justify-center h-full op50 text-sm">
          No messages
        </div>
        <div
          v-for="entry of filteredEntries"
          :key="entry.id"
          :data-selected="selectedId === entry.id || undefined"
          class="w-full text-left border-b border-base hover:bg-active transition border-l-2 text-sm group cursor-pointer"
          :class="[
            selectedId === entry.id ? 'bg-active' : '',
          ]"
          @click="selectedId = selectedId === entry.id ? null : entry.id"
        >
          <MessageItem :entry class="px-3 py-2.5">
            <template #actions>
              <button
                class="op0 group-hover:op50 hover:op100! p-0.5 rounded hover:bg-active flex-none"
                title="Dismiss"
                @click.stop="removeEntry(entry.id)"
              >
                <div class="i-ph-trash-duotone w-3 h-3" />
              </button>
            </template>
          </MessageItem>
        </div>
      </div>

      <!-- Detail panel -->
      <div v-if="selectedEntry" class="h-full of-y-auto border-l border-base p-4">
        <!-- Header -->
        <div class="flex items-start gap-2 mb-3">
          <div class="flex-1">
            <div class="font-medium text-lg">
              {{ selectedEntry.message }}
            </div>
          </div>
          <!-- Dismiss button -->
          <button class="op50 hover:op100 p-1" title="Dismiss" @click="removeEntry(selectedEntry!.id)">
            <div class="i-ph-trash-duotone w-4 h-4" />
          </button>
          <!-- Close button -->
          <button class="op50 hover:op100 p-1" title="Close detail" @click="selectedId = null">
            <div class="i-ph-x w-4 h-4" />
          </button>
        </div>

        <!-- Metadata row -->
        <div class="flex flex-wrap items-center gap-2 mb-3 text-xs">
          <span class="flex items-center gap-1" :class="levels[selectedEntry.level].color">
            <div :class="levels[selectedEntry.level].icon" class="w-3.5 h-3.5" />
            <span class="capitalize">{{ selectedEntry.level }}</span>
          </span>
          <span v-if="fromEntries[selectedEntry.from as DevToolsMessageEntryFrom]" class="flex items-center gap-1" :class="fromEntries[selectedEntry.from as DevToolsMessageEntryFrom].color">
            <div :class="fromEntries[selectedEntry.from as DevToolsMessageEntryFrom].icon" class="w-3.5 h-3.5" />
            {{ fromEntries[selectedEntry.from as DevToolsMessageEntryFrom].label }}
          </span>
          <span v-if="selectedEntry.status === 'loading'" class="flex items-center gap-1 text-amber">
            <div class="w-3 h-3 border-1.5 border-current border-t-transparent rounded-full animate-spin" />
            Loading
          </span>
          <span class="op40" :title="formatAbsoluteTime(selectedEntry.timestamp)">
            {{ selectedTimeAgo }}
          </span>
          <span v-if="selectedEntry.notify" class="flex items-center gap-0.5 op40">
            <div class="i-ph:bell-duotone w-3.5 h-3.5" />
            notify
          </span>
        </div>

        <!-- Description -->
        <div v-if="selectedEntry.description" class="text-sm op80 mb-3 whitespace-pre-wrap">
          {{ selectedEntry.description }}
        </div>

        <!-- Category + Labels -->
        <div v-if="selectedEntry.category || (selectedEntry.labels && selectedEntry.labels.length)" class="flex flex-wrap gap-1 mb-3">
          <HashBadge v-if="selectedEntry.category" :label="selectedEntry.category" class="cursor-pointer" @click="toggleCategory(selectedEntry.category)" />
          <HashBadge v-for="label of selectedEntry.labels" :key="label" :label="label" class="cursor-pointer" @click="toggleLabelFilter(label)" />
        </div>

        <!-- File position -->
        <button
          v-if="selectedEntry.filePosition"
          class="flex items-start gap-1.5 text-left text-sm text-blue hover:underline mb-3 break-all"
          @click="openFile(selectedEntry!)"
        >
          <div class="i-ph:file-code-duotone w-4 h-4 flex-none mt-0.5" />
          <span>{{ selectedEntry.filePosition.file }}<template v-if="selectedEntry.filePosition.line">:{{ selectedEntry.filePosition.line }}</template><template v-if="selectedEntry.filePosition.column">:{{ selectedEntry.filePosition.column }}</template></span>
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
          <div v-if="selectedEntry.elementPosition.boundingBox" class="text-xs op50 mt-1 font-mono">
            {{ selectedEntry.elementPosition.boundingBox.x }}, {{ selectedEntry.elementPosition.boundingBox.y }}
            ({{ selectedEntry.elementPosition.boundingBox.width }} × {{ selectedEntry.elementPosition.boundingBox.height }})
          </div>
        </div>

        <!-- Stacktrace -->
        <div v-if="selectedEntry.stacktrace" class="mb-3">
          <div class="op50 text-xs mb-1">
            Stack Trace
          </div>
          <div class="group relative">
            <pre class="text-xs bg-gray/5 rounded p-2 of-x-auto whitespace-pre-wrap font-mono">{{ selectedEntry.stacktrace }}</pre>
            <button
              class="group/bt absolute top-1.5 right-1.5 op0 group-hover:op100 p-1 rounded bg-base border border-base transition"
              title="Copy"
              @click="copyStacktrace(selectedEntry.stacktrace)"
            >
              <div
                :class="stacktraceCopied ? 'i-ph:check' : 'i-ph:copy'"
                class="op50 group-hover/bt:op100 size-3.5"
              />
            </button>
          </div>
        </div>

        <!-- Timers -->
        <div v-if="selectedEntry.autoDismiss || selectedEntry.autoDelete" class="flex flex-wrap gap-3 mb-3 text-xs op50">
          <span v-if="selectedEntry.autoDismiss" class="flex items-center gap-1">
            <div class="i-ph:bell-slash-duotone w-3.5 h-3.5" />
            Auto-dismiss: {{ selectedEntry.autoDismiss / 1000 }}s
          </span>
          <span v-if="selectedEntry.autoDelete" class="flex items-center gap-1">
            <div class="i-ph:timer-duotone w-3.5 h-3.5" />
            Auto-delete: {{ selectedEntry.autoDelete / 1000 }}s
          </span>
        </div>

        <!-- ID + Timestamp -->
        <div class="flex flex-col gap-1 mb-3 text-xs op40 font-mono border-t border-base pt-3">
          <span>ID: {{ selectedEntry.id }}</span>
          <span>{{ formatAbsoluteTime(selectedEntry.timestamp) }} ({{ new Date(selectedEntry.timestamp).toLocaleDateString() }})</span>
        </div>
      </div>
    </div>
  </div>
</template>
