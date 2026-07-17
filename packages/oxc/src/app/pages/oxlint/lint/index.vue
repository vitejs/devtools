<script setup lang="ts">
import FormCheckbox from '@vitejs/devtools-ui/components/Form/FormCheckbox.vue'
import OverlayModal from '@vitejs/devtools-ui/components/Overlay/OverlayModal.vue'
import VisualEmptyState from '@vitejs/devtools-ui/components/Visual/VisualEmptyState.vue'
import { useAsyncState, useLocalStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useRouter } from '#app/composables/router'
import { useRpc } from '#imports'

const rpc = useRpc()
const router = useRouter()

const { state: lintResults, execute: reloadResults } = useAsyncState(
  () => rpc.value.call('devtools-oxc:list-lint-results'),
  [],
)
const { state: capabilities } = useAsyncState(
  () => rpc.value.call('devtools-oxc:lint-capabilities'),
  { canRun: false },
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

function requestDelete(resultId: string) {
  selectedResultId.value = resultId
  deleteOpen.value = true
}
</script>

<template>
  <div flex="~ col" gap-4 max-w-180 mx-auto p6>
    <Back />
    <div v-if="lintResults.length > 0" flex justify-between items-center w-full>
      <div flex items-center gap-2>
        <button
          btn-action-sm
          cursor-pointer
          aria-label="Reload lint results"
          @click="reloadResults()"
        >
          <div i-lucide-refresh-cw />
        </button>

        <p op-fade>Select a lint result to inspect:</p>
      </div>

      <div flex items-center gap-3>
        <FormCheckbox v-model="hidePassed" label="Hide Passed" />
        <button v-if="capabilities.canRun" btn-action :disabled="isRunning" @click="runLint()">
          <div :class="isRunning ? 'i-svg-spinners-ring-resize' : 'i-ph-play-duotone'" />
          {{ isRunning ? 'Running…' : 'Run Lint' }}
        </button>
      </div>
    </div>

    <template v-if="filteredLintResults.length > 0">
      <LintResultCard
        v-for="result in filteredLintResults"
        :key="result.timestamp"
        :result="result"
        @delete="requestDelete"
      />
    </template>

    <VisualEmptyState
      v-else
      w-full
      mt4
      border="~ base rounded-lg dashed"
      title="No lint results found"
      icon="i-ph-folder-simple-duotone"
    >
      <template #description>
        <div text-sm op-fade leading-7>Lint results will appear here after lint runs.</div>
      </template>
      <button
        v-if="capabilities.canRun && lintResults.length === 0"
        btn-action
        :disabled="isRunning"
        @click="runLint()"
      >
        <div :class="isRunning ? 'i-svg-spinners-ring-resize' : 'i-ph-play-duotone'" />
        {{ isRunning ? 'Running…' : 'Run Lint' }}
      </button>
    </VisualEmptyState>

    <OverlayModal v-model:open="deleteOpen">
      <template #title> Delete lint result </template>
      <div flex="~ col" gap-4 min-w-80>
        <p>Delete lint result {{ selectedResultId }}?</p>
        <div flex justify-end gap-2>
          <button btn-action :disabled="isDeleting" @click="deleteOpen = false">Cancel</button>
          <button btn-action text-red :disabled="isDeleting" @click="deleteResult()">
            {{ isDeleting ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </OverlayModal>
  </div>
</template>
