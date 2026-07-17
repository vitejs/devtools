<script setup lang="ts">
import DisplayCloseButton from '@vitejs/devtools-ui/components/Display/DisplayCloseButton.vue'
import VisualEmptyState from '@vitejs/devtools-ui/components/Visual/VisualEmptyState.vue'
import { useAsyncState, useDebounceFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { isMatch } from 'picomatch'
import { useRpc } from '#imports'

const props = defineProps<{
  resultId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const rpc = useRpc()
const { state: lintResult, isLoading } = useAsyncState(
  () => rpc.value.call('devtools-oxc:get-lint-result', { resultId: props.resultId }),
  null,
)

const showEmpty = computed(() => lintResult.value?.logs.files.length === 0)

const totalIssues = computed(() => {
  if (!lintResult.value?.logs) return 0

  return lintResult.value.logs.files.reduce(
    (sum, file) => sum + file.lines.reduce((lineSum, line) => lineSum + line.messages.length, 0),
    0,
  )
})

const showSummary = computed(() => !!lintResult.value?.meta.summary)
const search = ref('')
const debouncedSearch = ref('')
const debouncedUpdateSearch = useDebounceFn((value: string) => {
  debouncedSearch.value = value
}, 300)

function resetSearch() {
  search.value = ''
  debouncedSearch.value = ''
}

watch(search, value => debouncedUpdateSearch(value), { immediate: true })

const filteredFiles = computed(() => {
  if (!lintResult.value?.logs?.files) return []

  const searchTerm = debouncedSearch.value.trim()
  if (!searchTerm) return lintResult.value.logs.files

  try {
    return lintResult.value.logs.files.filter(file =>
      isMatch(file.filename, searchTerm, { contains: true }),
    )
  } catch {
    return lintResult.value.logs.files.filter(file => file.filename.includes(searchTerm))
  }
})

const showFiles = computed(() => filteredFiles.value.length > 0)
</script>

<template>
  <div relative h-full w-full>
    <DisplayCloseButton absolute right-1 top-1 z-panel-content bg-glass @click="emit('close')" />

    <VisualLoading v-if="isLoading" text="Loading lint result..." />
    <div v-else h-full of-auto flex="~ col" gap-4 p7>
      <SummaryCard
        v-if="showSummary && lintResult?.meta.summary"
        :summary="lintResult.meta.summary"
        :total-issues="totalIssues"
        :version="lintResult.meta.version"
        :config="lintResult.logs.config"
        :timestamp="lintResult.meta.timestamp"
      />

      <Search v-model="search" />

      <VisualEmptyState
        v-if="showEmpty"
        icon="i-twemoji:partying-face"
        description="Congratulations! There is no oxlint issues."
      />

      <template v-else>
        <div v-if="showFiles" grid="~ cols-1 lg:cols-2" gap-4>
          <FileCard v-for="file in filteredFiles" :key="file.filename" :file="file" />
        </div>

        <VisualEmptyState
          v-else
          icon="i-ph-file-minus-light"
          description="No files found."
          border="~ base rounded-lg dashed"
        >
          <button btn-action @click="resetSearch">Reset search</button>
        </VisualEmptyState>
      </template>
    </div>
  </div>
</template>
