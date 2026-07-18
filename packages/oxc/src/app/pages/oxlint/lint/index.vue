<script setup lang="ts">
import FormCheckbox from '@vitejs/devtools-ui/components/Form/FormCheckbox.vue'
import OverlayModal from '@vitejs/devtools-ui/components/Overlay/OverlayModal.vue'
import VisualEmptyState from '@vitejs/devtools-ui/components/Visual/VisualEmptyState.vue'
import { groupByDate } from '@vitejs/devtools-ui/utils/date-groups'
import { useAsyncState, useLocalStorage } from '@vueuse/core'
import { computed, reactive, ref } from 'vue'
import { useRouter } from '#app/composables/router'
import { useRpc } from '#imports'

const rpc = useRpc()
const router = useRouter()

const { state: lintResults, execute: reloadResults } = useAsyncState(
  () => rpc.value.call('devtools-oxc:list-lint-results'),
  [],
)
const { isLoading: isRunning, execute: runLint } = useAsyncState(
  async () => {
    const resultId = await rpc.value.call('devtools-oxc:run-lint')
    await reloadResults()
    const result = lintResults.value?.find(item => item.timestamp === resultId)
    if (result?.summary.files_with_issues)
      await router.push({ query: { result: String(resultId) } })
  },
  undefined,
  { immediate: false },
)

const hidePassed = useLocalStorage('hidePassed', false)
const deleteOpen = ref(false)
const selectedResultId = ref('')
const { isLoading: isDeleting, execute: deleteResult } = useAsyncState(
  async () => {
    await rpc.value.call('devtools-oxc:delete-lint-result', {
      resultId: selectedResultId.value,
    })
    deleteOpen.value = false
    await reloadResults()
  },
  undefined,
  { immediate: false },
)

const filteredLintResults = computed(() => {
  return (
    lintResults.value?.filter(meta => !hidePassed.value || meta.summary.files_with_issues > 0) || []
  )
})
const lintResultGroups = computed(() =>
  groupByDate(filteredLintResults.value, result => result.timestamp),
)

const openOverrides = reactive<Record<string, boolean>>({})
function isGroupOpen(group: { key: string; defaultOpen: boolean }) {
  return openOverrides[group.key] ?? group.defaultOpen
}
function toggleGroup(group: { key: string }, open: boolean) {
  openOverrides[group.key] = open
}

function requestDelete(resultId: string) {
  selectedResultId.value = resultId
  deleteOpen.value = true
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-180 mx-auto p6">
    <div class="flex justify-between items-start w-full">
      <Back to="/" />
      <div v-if="lintResults.length > 0" class="flex items-center gap-3">
        <button class="btn-action-sm" :disabled="isRunning" @click="runLint()">
          <div :class="isRunning ? 'i-svg-spinners-ring-resize' : 'i-ph-play-duotone'" />
          {{ isRunning ? 'Running…' : 'Run Lint' }}
        </button>
        <button class="btn-action-sm cursor-pointer" @click="reloadResults()">
          <div class="i-lucide-refresh-cw" />
          Refresh
        </button>
      </div>
    </div>
    <FormCheckbox v-if="lintResults.length > 0" v-model="hidePassed" label="Hide Passed" />

    <template v-if="lintResultGroups.length > 0">
      <details
        v-for="group of lintResultGroups"
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
          <LintResultCard
            v-for="result in group.items"
            :key="result.timestamp"
            :result="result"
            @delete="requestDelete"
          />
        </div>
      </details>
    </template>

    <VisualEmptyState
      v-else
      class="w-full mt4 border border-base rounded-lg border-dashed"
      title="No lint results found"
      icon="i-ph-folder-simple-duotone"
    >
      <template #description>
        <div class="text-sm op-fade leading-7">Lint results will appear here after lint runs.</div>
      </template>
      <button
        v-if="lintResults.length === 0"
        class="btn-action"
        :disabled="isRunning"
        @click="runLint()"
      >
        <div :class="isRunning ? 'i-svg-spinners-ring-resize' : 'i-ph-play-duotone'" />
        {{ isRunning ? 'Running…' : 'Run Lint' }}
      </button>
    </VisualEmptyState>

    <OverlayModal v-model:open="deleteOpen">
      <template #title> Delete lint result </template>
      <div class="flex flex-col gap-4 min-w-80">
        <p>Delete lint result {{ selectedResultId }}?</p>
        <div class="flex justify-end gap-2">
          <button class="btn-action" :disabled="isDeleting" @click="deleteOpen = false">
            Cancel
          </button>
          <button class="btn-action text-red" :disabled="isDeleting" @click="deleteResult()">
            {{ isDeleting ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </OverlayModal>
  </div>
</template>
