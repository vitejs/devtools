<script setup lang="ts">
import type { HmrUpdate } from '../../shared/types'
import { useAsyncState, useIntervalFn } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'
import { useRpc } from '#imports'

const rpc = useRpc()
const filter = ref('')
const liveMode = ref(true)
const listRef = ref<HTMLElement>()

const { state: updates, isLoading, execute: refresh } = useAsyncState(
  () => rpc.value.call('vite:hmr-updates') as Promise<HmrUpdate[]>,
  [] as HmrUpdate[],
  { resetOnExecute: false },
)

useIntervalFn(refresh, 1000)

// Auto-scroll to top only when new updates arrive AND user is already near the top
const lastSeenId = ref<string | null>(null)
const missedUpdates = ref(0)
watch(() => updates.value?.[0]?.id, async (newestId) => {
  if (!newestId || newestId === lastSeenId.value)
    return
  lastSeenId.value = newestId
  if (!liveMode.value || !listRef.value) {
    missedUpdates.value++
    return
  }
  // Only auto-scroll if user is already near the top (within 100px)
  if (listRef.value.scrollTop <= 100) {
    await nextTick()
    listRef.value!.scrollTop = 0
  }
  else {
    missedUpdates.value++
  }
})

function scrollToTop() {
  if (listRef.value) {
    listRef.value.scrollTop = 0
    missedUpdates.value = 0
  }
}

function onListScroll() {
  if (listRef.value && listRef.value.scrollTop <= 100) {
    missedUpdates.value = 0
  }
}

interface GroupedUpdate {
  key: string
  file: string
  updates: typeof updates.value
  count: number
  latestTimestamp: number
}

const filteredUpdates = computed(() => {
  if (!filter.value)
    return updates.value ?? []
  const q = filter.value.toLowerCase()
  return (updates.value ?? []).filter(u =>
    u.files.some(f => f.toLowerCase().includes(q))
    || u.modules.some(m => m.toLowerCase().includes(q)),
  )
})

const groupedByFile = computed<GroupedUpdate[]>(() => {
  const groups = new Map<string, GroupedUpdate>()
  for (const update of filteredUpdates.value) {
    const file = update.files[0] ?? 'unknown'
    const existing = groups.get(file)
    if (existing) {
      existing.updates.push(update)
      existing.count++
      if (update.timestamp > existing.latestTimestamp) {
        existing.latestTimestamp = update.timestamp
      }
    }
    else {
      groups.set(file, {
        key: file,
        file,
        updates: [update],
        count: 1,
        latestTimestamp: update.timestamp,
      })
    }
  }
  return Array.from(groups.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp)
})

const viewMode = ref<'timeline' | 'grouped'>('timeline')

async function clearHistory() {
  await rpc.value.call('vite:hmr-clear')
  await refresh()
}

function openInEditor(file: string) {
  rpc.value.call('vite:core:open-in-editor', file)
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString()
}

function timeAgo(timestamp: number) {
  const diff = Date.now() - timestamp
  if (diff < 1000)
    return 'just now'
  if (diff < 60000)
    return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000)
    return `${Math.floor(diff / 60000)}m ago`
  return formatTime(timestamp)
}

function getRelativePath(file: string) {
  return file.replace(/^.*\//, '')
}
</script>

<template>
  <div p4 flex="~ col gap-4" h-full of-hidden>
    <!-- Header -->
    <div flex="~ items-center gap-2 sm:gap-3 flex-wrap">
      <h1 text-base sm:text-lg font-semibold flex="~ items-center gap-2">
        <div class="i-ph-lightning-duotone" text-xl />
        <span>HMR Inspector</span>
      </h1>
      <div flex-1 />

      <!-- View mode toggle -->
      <div flex="~ items-center" border="~ base rounded" text-sm>
        <button
          v-tooltip="'Timeline view'"
          px2 py1
          :class="viewMode === 'timeline' ? 'bg-active' : 'hover:bg-active/50'"
          @click="viewMode = 'timeline'"
        >
          <div class="i-ph-list" />
        </button>
        <button
          v-tooltip="'Grouped by file'"
          px2 py1
          :class="viewMode === 'grouped' ? 'bg-active' : 'hover:bg-active/50'"
          @click="viewMode = 'grouped'"
        >
          <div class="i-ph-stack" />
        </button>
      </div>

      <input
        v-model="filter"
        placeholder="Filter..."
        border="~ base rounded"
        px2 py1 text-sm
        class="w-32 sm:w-60"
        bg-transparent
        outline-none
        focus:border-primary
      >

      <!-- Live mode toggle -->
      <button
        v-tooltip="liveMode ? 'Disable live mode' : 'Enable live mode'"
        border="~ base rounded"
        px2 py1 text-sm flex="~ items-center gap-1"
        :class="liveMode ? 'text-green border-green/50' : 'hover:bg-active'"
        @click="liveMode = !liveMode"
      >
        <div class="i-ph-broadcast" :class="liveMode ? 'animate-pulse' : ''" />
        Live
      </button>

      <button
        v-tooltip="'Clear history'"
        border="~ base rounded"
        px2 py1 text-sm
        hover:bg-active
        @click="clearHistory"
      >
        <div class="i-ph-trash" />
      </button>
      <button
        v-tooltip="'Refresh'"
        border="~ base rounded"
        px2 py1 text-sm
        hover:bg-active
        @click="refresh()"
      >
        <div class="i-ph-arrow-clockwise" />
      </button>
    </div>

    <!-- Empty states -->
    <div v-if="isLoading && !updates?.length" flex-1 flex items-center justify-center>
      <div op50>
        Loading HMR history...
      </div>
    </div>

    <div v-else-if="!filteredUpdates.length" flex-1 flex items-center justify-center>
      <div op50 flex="~ col items-center gap-2">
        <div class="i-ph-lightning-duotone" text-4xl />
        <span>No HMR updates yet</span>
        <span text-xs>Edit a file to see updates appear here</span>
      </div>
    </div>

    <!-- Timeline view -->
    <div v-else-if="viewMode === 'timeline'" class="flex-1 of-hidden relative">
      <!-- New updates indicator (positioned over the scroll container) -->
      <Transition name="slide-down">
        <button
          v-if="missedUpdates > 0"
          absolute top-2 left="50%" z-10
          class="-translate-x-50%"
          flex="~ items-center gap-1.5"
          bg-primary text-white
          px3 py1.5 rounded-full
          text-xs font-medium
          shadow-lg
          hover:opacity-90
          transition-opacity
          @click="scrollToTop"
        >
          <div class="i-ph-arrow-up" />
          {{ missedUpdates }} new update{{ missedUpdates > 1 ? 's' : '' }}
        </button>
      </Transition>
      <div ref="listRef" h-full of-auto @scroll="onListScroll">
        <div flex="~ col gap-1">
          <div
            v-for="update in filteredUpdates"
            :key="update.id"
            border="~ base rounded"
            p2 sm:p3 flex="~ col gap-1"
            hover:bg-active
            transition-colors
          >
            <div flex="~ items-center gap-2 flex-wrap">
              <div
                :class="update.type === 'full-reload' ? 'i-ph-arrow-counter-clockwise text-orange' : 'i-ph-lightning text-green'"
              />
              <span text-xs op50 font-mono>
                {{ formatTime(update.timestamp) }}
              </span>
              <span
                text-xs px1 rounded
                :class="update.type === 'full-reload' ? 'bg-orange/20 text-orange' : 'bg-green/20 text-green'"
              >
                {{ update.type === 'full-reload' ? 'Full Reload' : 'HMR Update' }}
              </span>
              <div flex-1 />
              <span text-xs op30 hidden sm:inline>{{ timeAgo(update.timestamp) }}</span>
            </div>
            <div pl5 flex="~ col gap-0.5" of-hidden>
              <div
                v-for="file in update.files"
                :key="file"
                flex="~ items-center gap-1"
                text-sm group
                of-hidden
              >
                <div class="i-ph-file-duotone shrink-0" text-xs op50 />
                <span font-mono truncate :title="file">{{ getRelativePath(file) }}</span>
                <button
                  v-tooltip="'Open in editor'"
                  class="i-ph-pencil-simple shrink-0 op40 hover:op100"
                  text-xs
                  @click.stop="openInEditor(file)"
                />
              </div>
              <div
                v-for="mod in update.modules"
                :key="mod"
                flex="~ items-center gap-1"
                text-xs op40
                of-hidden
              >
                <div class="i-ph-cube-duotone shrink-0" text-xs />
                <span font-mono truncate :title="mod">{{ mod }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Grouped view -->
    <div v-else ref="listRef" flex-1 of-auto>
      <div flex="~ col gap-2">
        <div
          v-for="group in groupedByFile"
          :key="group.key"
          border="~ base rounded"
          p2 sm:p3 flex="~ col gap-2"
          hover:bg-active
          transition-colors
        >
          <div flex="~ items-center gap-2" of-hidden>
            <div class="i-ph-file-duotone shrink-0" op60 />
            <span font-mono text-sm truncate :title="group.file">{{ getRelativePath(group.file) }}</span>
            <button
              v-tooltip="'Open in editor'"
              class="i-ph-pencil-simple shrink-0 op40 hover:op100"
              text-xs
              @click.stop="openInEditor(group.file)"
            />
            <div flex-1 />
            <span
              text-xs px1.5 py0.5 rounded shrink-0
              class="bg-primary:15 text-primary"
              font-mono
            >
              {{ group.count }}x
            </span>
            <span text-xs op40 shrink-0 hidden sm:inline>{{ timeAgo(group.latestTimestamp) }}</span>
          </div>
          <div pl5 flex="~ gap-1 flex-wrap">
            <span
              v-for="update in group.updates.slice(0, 10)"
              :key="update.id"
              text-xs op40 font-mono
              border="~ base rounded"
              px1
            >
              {{ formatTime(update.timestamp) }}
            </span>
            <span v-if="group.count > 10" text-xs op30>
              +{{ group.count - 10 }} more
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div border="t base" pt2 text-xs op50 flex="~ items-center gap-2">
      <div class="i-ph-info" />
      <span>{{ filteredUpdates.length }} update(s)</span>
      <span v-if="viewMode === 'grouped'" op30>
        · {{ groupedByFile.length }} file(s)
      </span>
      <div flex-1 />
      <span v-if="liveMode" class="text-green" flex="~ items-center gap-1">
        <div class="i-ph-circle-fill animate-pulse" text-xs />
        <span hidden sm:inline>Live</span>
      </span>
    </div>
  </div>
</template>
