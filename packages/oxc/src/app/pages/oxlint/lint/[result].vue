<script setup lang="ts">
import VisualEmptyState from '@vitejs/devtools-ui/components/Visual/VisualEmptyState.vue'
import { useAsyncState, useDebounceFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { isMatch } from 'picomatch'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'

const route = useRoute()
const resultId = computed(() => String(route.params.result))

const rpc = useRpc()
const { state: lintResult, isLoading } = useAsyncState(
  () => rpc.value.call('devtools-oxc:get-lint-result', { resultId: resultId.value }),
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
const singleColumn = ref(false)
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
  <div class="h-full of-auto flex flex-col gap-4 p6" style="scrollbar-gutter: stable">
    <Back to="/oxlint/lint" />

    <VisualLoading v-if="isLoading" text="Loading lint result..." />

    <template v-else>
      <SummaryCard
        v-if="showSummary && lintResult?.meta.summary"
        :summary="lintResult.meta.summary"
        :total-issues="totalIssues"
        :version="lintResult.meta.version"
        :config="lintResult.logs.config"
        :timestamp="lintResult.meta.timestamp"
      />

      <div class="flex items-center gap-2">
        <Search v-model="search" class="flex-1" />
        <div
          class="hidden lg:flex flex-none flex-row justify-around w20 h8 border border-base rounded-8 of-hidden"
        >
          <button
            title="Show one column"
            class="flex-1 op50 flex items-center justify-center hover:bg-active hover:text-base hover:op100!"
            :class="{ 'bg-active text-base op100!': singleColumn }"
            @click="singleColumn = true"
          >
            <span class="i-ph-rows-duotone text-sm" />
          </button>
          <button
            title="Show two columns"
            class="flex-1 op50 flex items-center justify-center hover:bg-active hover:text-base hover:op100!"
            :class="{ 'bg-active text-base op100!': !singleColumn }"
            @click="singleColumn = false"
          >
            <span class="i-ph-columns-duotone text-sm" />
          </button>
        </div>
      </div>

      <VisualEmptyState
        v-if="showEmpty"
        icon="i-twemoji:partying-face"
        description="Congratulations! There is no oxlint issues."
      />

      <template v-else>
        <div
          v-if="showFiles"
          class="grid gap-4"
          :class="
            singleColumn || filteredFiles.length === 1
              ? 'grid-cols-1'
              : 'grid-cols-1 lg:grid-cols-2'
          "
        >
          <FileCard v-for="file in filteredFiles" :key="file.filename" :file="file" />
        </div>

        <VisualEmptyState
          v-else
          icon="i-ph-file-minus-light"
          description="No files found."
          class="border border-base rounded-lg border-dashed"
        >
          <button class="btn-action" @click="resetSearch">Reset search</button>
        </VisualEmptyState>
      </template>
    </template>
  </div>
</template>
