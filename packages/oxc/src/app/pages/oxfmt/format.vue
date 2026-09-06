<script setup lang="ts">
import ContainerCard from '@vitejs/devtools-ui/components/Container/ContainerCard.vue'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayFileIcon from '@vitejs/devtools-ui/components/Display/DisplayFileIcon.vue'
import DisplayTimestamp from '@vitejs/devtools-ui/components/Display/DisplayTimestamp.vue'
import VisualEmptyState from '@vitejs/devtools-ui/components/Visual/VisualEmptyState.vue'
import { groupByDate } from '@vitejs/devtools-ui/utils/date-groups'
import { useAsyncState } from '@vueuse/core'
import { computed, reactive, ref } from 'vue'
import { useRpc } from '#imports'

const rpc = useRpc()
const runFormatOpen = ref(false)
const expandedResults = ref<Record<number, boolean>>({})
const { state: formatResults, execute: reloadResults } = useAsyncState(
  () => rpc.value.call('devtools-oxc:list-format-results'),
  [],
)
const formatResultGroups = computed(() =>
  groupByDate(formatResults.value, result => result.timestamp),
)
const openOverrides = reactive<Record<string, boolean>>({})
function isGroupOpen(group: { key: string; defaultOpen: boolean }) {
  return openOverrides[group.key] ?? group.defaultOpen
}
function toggleGroup(group: { key: string }, open: boolean) {
  openOverrides[group.key] = open
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-180 mx-auto p6">
    <div class="flex justify-between items-start w-full">
      <Back to="/" />
      <div class="flex items-center gap-3">
        <button class="btn-action-sm" @click="runFormatOpen = true">
          <div class="i-ph-play-duotone" />
          Run Format
        </button>
        <button class="btn-action-sm cursor-pointer" @click="reloadResults()">
          <div class="i-lucide-refresh-cw" />
          Refresh
        </button>
      </div>
    </div>

    <template v-if="formatResultGroups.length">
      <details
        v-for="group of formatResultGroups"
        :key="group.key"
        :open="isGroupOpen(group)"
        @toggle="e => toggleGroup(group, (e.target as HTMLDetailsElement).open)"
      >
        <summary
          class="cursor-default select-none flex gap-1 items-center px1 py1 rounded hover:bg-active"
        >
          <div
            class="i-ph-caret-right-duotone transition op50"
            :class="isGroupOpen(group) ? 'rotate-90' : ''"
          />
          <span class="op70 text-sm">{{ group.label }}</span>
          <span class="op40 text-xs font-mono">{{ group.items.length }}</span>
        </summary>
        <div class="flex flex-col gap-2 pt2">
          <ContainerCard
            v-for="result in group.items"
            :key="result.timestamp"
            class="min-h-24 flex flex-col px4 py3"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex gap-1 items-center font-mono op50 text-sm">
                <div class="i-ph-hash-duotone" />
                {{ result.timestamp }}
              </div>
              <DisplayBadge
                :as="result.files.length ? 'button' : 'span'"
                :type="result.files.length ? 'button' : undefined"
                :aria-expanded="
                  result.files.length ? !!expandedResults[result.timestamp] : undefined
                "
                :aria-controls="
                  result.files.length ? `format-files-${result.timestamp}` : undefined
                "
                :color="false"
                :class="
                  result.status === 'clean'
                    ? 'badge-color-green'
                    : result.status === 'issues'
                      ? 'badge-color-amber'
                      : 'badge-color-red'
                "
                class="inline-flex items-center gap-1"
                @click="expandedResults[result.timestamp] = !expandedResults[result.timestamp]"
              >
                <div
                  :class="
                    result.status === 'clean'
                      ? 'i-ph-check-circle-duotone'
                      : result.status === 'issues'
                        ? 'i-ph-warning-duotone'
                        : 'i-ph-x-circle-duotone'
                  "
                />
                {{
                  result.status === 'clean'
                    ? 'Passed'
                    : result.status === 'issues'
                      ? `${result.files.length} files`
                      : 'Failed'
                }}
                <div
                  v-if="result.files.length"
                  class="i-ph-caret-down transition-transform"
                  :class="{ 'rotate-180': expandedResults[result.timestamp] }"
                  aria-hidden="true"
                />
              </DisplayBadge>
            </div>
            <ul
              v-if="result.files.length"
              v-show="expandedResults[result.timestamp]"
              :id="`format-files-${result.timestamp}`"
              class="my3 max-h-64 overflow-y-auto text-sm font-mono"
              aria-label="Format file results"
              tabindex="0"
            >
              <li v-for="file in result.files" :key="file.path" class="flex items-start gap-3 py2">
                <DisplayFileIcon :filename="file.path" class="mt0.5" />
                <span class="min-w-0 flex-1 break-all">{{ file.path }}</span>
                <span class="shrink-0 op50 tabular-nums">{{ file.durationMs }}ms</span>
              </li>
            </ul>
            <div class="mt-auto flex flex-wrap items-center justify-between gap-2 pt2 text-xs op50">
              <DisplayTimestamp :timestamp="result.timestamp" />
              <span>
                {{ result.summary.durationMs }}ms · {{ result.summary.fileCount }} files ·
                {{ result.summary.threadCount }} threads
              </span>
            </div>
          </ContainerCard>
        </div>
      </details>
    </template>

    <VisualEmptyState
      v-else
      class="w-full mt4 border border-base rounded-lg border-dashed"
      title="No format results found"
      icon="i-ph-folder-simple-duotone"
    >
      <template #description>
        <div class="text-sm op-fade leading-7">Run format to check the project files.</div>
      </template>
    </VisualEmptyState>

    <RunOxfmtDialog v-model:open="runFormatOpen" @refresh="reloadResults()" />
  </div>
</template>
