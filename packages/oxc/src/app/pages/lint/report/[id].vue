<script setup lang="ts">
import { useAsyncState, useDebounceFn } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { isMatch } from 'picomatch'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'

const sessionId = useRoute().params.id as string
const rpc = useRpc()
const { state: session, isLoading } = useAsyncState(
  () => rpc.value.call('devtools-oxc:get-lint-session', { sessionId }),
  null,
)

// Whether to show the empty state
const showEmpty = computed(() => session.value?.logs.files.length === 0)

// Compute the total number of issues
const totalIssues = computed(() => {
  if (!session.value?.logs) {
    return 0
  }
  return session.value.logs.files.reduce(
    (sum, file) => sum + file.lines.reduce((s, line) => s + line.messages.length, 0),
    0,
  )
})

// Whether to show the summary
const showSummary = computed(() => !!session.value?.meta.summary)

const search = ref('')

// Debounced search value
const debouncedSearch = ref('')

// Create a debounce function with VueUse's useDebounceFn
const debouncedUpdateSearch = useDebounceFn((value: string) => {
  debouncedSearch.value = value
}, 300)

// Watch for search value changes
watch(
  search,
  newValue => {
    debouncedUpdateSearch(newValue)
  },
  { immediate: true },
)

const filteredFiles = computed(() => {
  if (!session.value?.logs?.files) {
    return []
  }

  const searchTerm = debouncedSearch.value.trim()

  // Return all files when the search term is empty
  if (!searchTerm) {
    return session.value.logs.files
  }

  // Try glob matching with picomatch
  try {
    return session.value.logs.files.filter(file =>
      isMatch(file.filename, searchTerm, { contains: true }),
    )
  } catch {
    // Fall back to simple substring matching when the glob pattern is invalid
    return session.value.logs.files.filter(file => file.filename.includes(searchTerm))
  }
})

// Whether to show the file list
const showFiles = computed(() => !!filteredFiles.value && filteredFiles.value.length > 0)
</script>

<template>
  <VisualLoading v-if="isLoading" text="Loading session..." />
  <div v-else class="flex flex-col gap-4">
    <Back />
    <!-- Summary info -->
    <SummaryCard
      v-if="showSummary && session?.meta.summary"
      :summary="session.meta.summary"
      :total-issues="totalIssues"
      :version="session.meta.version"
      :config="session.logs.config"
      :timestamp="session.meta.timestamp"
    />

    <Search v-model="search" />

    <UEmpty
      v-if="showEmpty"
      icon="twemoji:partying-face"
      size="xl"
      description="Congratulations! There is no oxlint issues."
    />

    <template v-else>
      <div v-if="showFiles" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FileCard v-for="file in filteredFiles" :key="file.filename" :file="file" />
      </div>

      <UEmpty v-else icon="ph:file-duotone" size="xl" description="No files found." />
    </template>
  </div>
</template>
