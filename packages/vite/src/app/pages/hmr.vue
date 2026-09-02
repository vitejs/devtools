<script setup lang="ts">
import type { HmrUpdate } from '../../shared/types'
import HighlightedPath from '@vitejs/devtools-ui/components/HighlightedPath.vue'
import { useAsyncState, useIntervalFn } from '@vueuse/core'
import { computed, nextTick, ref, watch } from 'vue'
import { useRpc } from '#imports'
import HmrPropagationGraph from '../components/HmrPropagationGraph.vue'

const rpc = useRpc()
const filter = ref('')
const liveMode = ref(true)
const listRef = ref<HTMLElement>()
const selectedUpdate = ref<HmrUpdate | null>(null)

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
  selectedUpdate.value = null
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

function fileExt(file: string) {
  const m = file.match(/\.(\w+)$/)
  return m ? m[1] : ''
}

const graphNodeMap = computed(() => {
  if (!selectedUpdate.value)
    return new Map()
  return new Map(selectedUpdate.value.graph.nodes.map(n => [n.id, n]))
})
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
      <!-- List -->
      <div class="h-full of-hidden relative w-full" transition-all>
        <!-- New updates indicator -->
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
              p2 flex="~ col gap-0.5"
              cursor-pointer
              transition-colors
              :class="selectedUpdate?.id === update.id ? 'bg-active border-primary/40' : 'hover:bg-active'"
              @click="selectedUpdate = selectedUpdate?.id === update.id ? null : update"
            >
              <div flex="~ items-center gap-2">
                <div
                  class="shrink-0"
                  :class="update.type === 'full-reload' ? 'i-ph-arrow-counter-clockwise text-orange' : 'i-ph-lightning text-green'"
                />
                <div
                  v-for="file in update.files"
                  :key="file"
                  flex="~ items-center gap-1"
                  text-sm group of-hidden flex-1
                >
                  <span font-mono truncate :title="file"><HighlightedPath :path="file" /></span>
                  <button
                    v-tooltip="'Open in editor'"
                    class="i-ph-pencil-simple shrink-0"
                    op0 group-hover:op60 hover:op100
                    text-xs
                    @click.stop="openInEditor(file)"
                  />
                </div>
                <span text-xs op30 font-mono shrink-0>{{ timeAgo(update.timestamp) }}</span>
              </div>
              <div v-if="update.boundaries.length" pl5 flex="~ items-center gap-1" text-xs op50>
                <div class="i-ph-arrows-in-simple shrink-0" />
                <span op60>boundary:</span>
                <span
                  v-for="b in update.boundaries"
                  :key="b"
                  font-mono truncate
                  :title="b"
                ><HighlightedPath :path="b" /></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail slideover -->
      <Transition name="slide-right">
        <div
          v-if="selectedUpdate"
          absolute top-0 right-0 bottom-0
          class="w-55% max-w-2xl"
          bg-base
          border="l base"
          flex="~ col"
          of-hidden
          z-20
          shadow-xl
        >
          <div flex="~ items-center gap-2" p2 border="b base">
            <div class="i-ph-graph-duotone" op60 />
            <span text-sm font-medium>Update Details</span>
            <div flex-1 />
            <span text-xs op40 font-mono>{{ formatTime(selectedUpdate.timestamp) }}</span>
            <button
              v-tooltip="'Close'"
              class="i-ph-x shrink-0 op40 hover:op100"
              text-sm
              @click="selectedUpdate = null"
            />
          </div>

          <div flex-1 of-auto p3>
            <!-- Summary badges -->
            <div flex="~ items-center gap-1.5 flex-wrap" mb3>
              <span
                v-if="selectedUpdate.changeType"
                text-xs px1.5 py0.5 rounded
                :class="{
                  'bg-green/15 text-green': selectedUpdate.changeType === 'create',
                  'bg-blue/15 text-blue': selectedUpdate.changeType === 'update',
                  'bg-red/15 text-red': selectedUpdate.changeType === 'delete',
                }"
              >
                {{ selectedUpdate.changeType === 'create' ? 'file created' : selectedUpdate.changeType === 'delete' ? 'file deleted' : 'file modified' }}
              </span>
              <span text-xs px1.5 py0.5 rounded op50 border="~ base">
                {{ selectedUpdate.graph.nodes.length }} module{{ selectedUpdate.graph.nodes.length !== 1 ? 's' : '' }}
              </span>
              <span text-xs px1.5 py0.5 rounded op50 border="~ base">
                {{ selectedUpdate.boundaries.length }} {{ selectedUpdate.boundaries.length === 1 ? 'boundary' : 'boundaries' }}
              </span>
            </div>

            <!-- Propagation graph -->
            <div v-if="selectedUpdate.graph.nodes.length" mb3>
              <div op50 text-xs font-medium mb1>
                Propagation
              </div>
              <div of-auto border="~ base rounded" p2>
                <HmrPropagationGraph
                  :key="selectedUpdate.id"
                  :nodes="selectedUpdate.graph.nodes"
                  :edges="selectedUpdate.graph.edges"
                />
                <div v-if="selectedUpdate.graph.nodes.every(node => node.selfAccepting)" op50 text-xs text-center py1>
                  Self-accepting — handles its own update
                </div>
              </div>
            </div>

            <!-- Detail sections -->
            <div flex="~ col gap-3" text-xs>
              <!-- Changed files -->
              <div>
                <div op50 mb1 font-medium>
                  Changed Files
                </div>
                <div
                  v-for="file in selectedUpdate.files"
                  :key="file"
                  flex="~ items-center gap-1.5"
                  group py0.5
                >
                  <div class="i-ph-file-duotone shrink-0 text-green" />
                  <span font-mono truncate><HighlightedPath :path="file" /></span>
                  <span
                    v-if="fileExt(file)"
                    text-xs op30 px1 rounded border="~ base" shrink-0
                  >{{ fileExt(file) }}</span>
                  <button
                    v-tooltip="'Open in editor'"
                    class="i-ph-pencil-simple shrink-0"
                    op0 group-hover:op60 hover:op100
                    @click.stop="openInEditor(file)"
                  />
                </div>
              </div>

              <!-- Invalidated modules -->
              <div v-if="selectedUpdate.modules.length">
                <div op50 mb1 font-medium>
                  Invalidated Modules
                  <span op40>({{ selectedUpdate.modules.length }})</span>
                </div>
                <div
                  v-for="mod in selectedUpdate.modules"
                  :key="mod"
                  flex="~ items-center gap-1.5"
                  py0.5
                >
                  <div
                    class="shrink-0"
                    :class="graphNodeMap.get(mod)?.moduleType === 'css' ? 'i-ph-paint-brush text-purple' : 'i-ph-cube text-gray'"
                  />
                  <span font-mono truncate op70 :title="mod"><HighlightedPath :path="mod" /></span>
                  <span
                    v-if="graphNodeMap.get(mod)?.moduleType"
                    text-xs op30 px1 rounded border="~ base" shrink-0
                  >{{ graphNodeMap.get(mod)?.moduleType }}</span>
                  <span
                    v-if="graphNodeMap.get(mod)?.selfAccepting"
                    text-xs op40 shrink-0
                    class="text-green"
                  >self-accepting</span>
                </div>
              </div>

              <!-- Boundaries -->
              <div v-if="selectedUpdate.boundaries.length">
                <div op50 mb1 font-medium>
                  HMR Boundaries
                  <span op40>({{ selectedUpdate.boundaries.length }})</span>
                </div>
                <div
                  v-for="b in selectedUpdate.boundaries"
                  :key="b"
                  flex="~ col gap-0.5"
                  py0.5
                >
                  <div flex="~ items-center gap-1.5">
                    <div class="i-ph-arrows-in-simple shrink-0 text-blue" />
                    <span font-mono truncate class="text-blue" :title="b"><HighlightedPath :path="b" /></span>
                    <span
                      v-if="graphNodeMap.get(b)?.moduleType"
                      text-xs op30 px1 rounded border="~ base" shrink-0
                    >{{ graphNodeMap.get(b)?.moduleType }}</span>
                    <span
                      v-if="graphNodeMap.get(b)?.selfAccepting"
                      text-xs shrink-0 class="text-green/60"
                    >self</span>
                    <span
                      v-else-if="graphNodeMap.get(b)?.acceptedDeps?.length"
                      text-xs shrink-0 op40
                    >accepts {{ graphNodeMap.get(b)!.acceptedDeps!.length }} dep(s)</span>
                  </div>
                  <!-- Accepted deps detail -->
                  <div
                    v-if="graphNodeMap.get(b)?.acceptedDeps?.length"
                    pl5 flex="~ col" op40
                  >
                    <span v-for="dep in graphNodeMap.get(b)!.acceptedDeps!" :key="dep" font-mono truncate :title="dep">
                      ← <HighlightedPath :path="dep" />
                    </span>
                  </div>
                  <!-- Accepted exports -->
                  <div
                    v-if="graphNodeMap.get(b)?.acceptedExports?.length"
                    pl5 op40
                  >
                    exports: {{ graphNodeMap.get(b)!.acceptedExports!.join(', ') }}
                  </div>
                </div>
              </div>

              <!-- Graph nodes summary -->
              <div v-if="selectedUpdate.graph.nodes.length > selectedUpdate.modules.length">
                <div op50 mb1 font-medium>
                  All Modules in Chain
                  <span op40>({{ selectedUpdate.graph.nodes.length }})</span>
                </div>
                <div
                  v-for="node in selectedUpdate.graph.nodes"
                  :key="node.id"
                  flex="~ items-center gap-1.5"
                  py0.5
                >
                  <div
                    class="w-2 h-2 rounded-full shrink-0"
                    :class="{
                      'bg-green': node.type === 'source',
                      'bg-gray': node.type === 'intermediate',
                      'bg-blue': node.type === 'boundary',
                    }"
                  />
                  <span font-mono truncate op60 :title="node.id"><HighlightedPath :path="node.id" /></span>
                  <span
                    v-if="node.moduleType"
                    text-xs op25 px1 rounded border="~ base" shrink-0
                  >{{ node.moduleType }}</span>
                  <span text-xs op30 shrink-0>{{ node.type }}</span>
                  <span v-if="node.importersCount" text-xs op25 shrink-0>
                    {{ node.importersCount }} importer{{ node.importersCount !== 1 ? 's' : '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Grouped view -->
    <div v-else ref="listRef" flex-1 of-auto>
      <div flex="~ col gap-1">
        <div
          v-for="group in groupedByFile"
          :key="group.key"
          border="~ base rounded"
          p2 flex="~ col gap-1"
          hover:bg-active
          transition-colors
        >
          <div flex="~ items-center gap-2" of-hidden>
            <div class="i-ph-file-duotone shrink-0" op60 />
            <span font-mono text-sm truncate :title="group.file"><HighlightedPath :path="group.file" /></span>
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
            <span text-xs op40 shrink-0>{{ timeAgo(group.latestTimestamp) }}</span>
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
    </div>
  </div>
</template>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.2s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
