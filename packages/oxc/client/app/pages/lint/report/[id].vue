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

// 判断是否显示空状态
const showEmpty = computed(() => session.value?.logs.files.length === 0)

// 计算问题总数
const totalIssues = computed(() => {
  if (!session.value?.logs) {
    return 0
  }
  return session.value.logs.files.reduce(
    (sum, file) => sum + file.lines.reduce((s, line) => s + line.messages.length, 0),
    0,
  )
})

// 判断是否显示摘要
const showSummary = computed(() => !!session.value?.meta.summary)

const search = ref('')

// 防抖的搜索值
const debouncedSearch = ref('')

// 使用 VueUse 的 useDebounceFn 创建防抖函数
const debouncedUpdateSearch = useDebounceFn((value: string) => {
  debouncedSearch.value = value
}, 300)

// 监听搜索值变化
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

  // 如果搜索词为空，返回所有文件
  if (!searchTerm) {
    return session.value.logs.files
  }

  // 尝试使用 picomatch 进行 glob 匹配
  try {
    return session.value.logs.files.filter(file =>
      isMatch(file.filename, searchTerm, { contains: true }),
    )
  } catch {
    // 如果 glob 模式无效，回退到简单的字符串包含匹配
    return session.value.logs.files.filter(file => file.filename.includes(searchTerm))
  }
})

// 判断是否显示文件列表
const showFiles = computed(() => !!filteredFiles.value && filteredFiles.value.length > 0)
</script>

<template>
  <VisualLoading v-if="isLoading" text="Loading session..." />
  <div v-else class="flex flex-col gap-4">
    <Back />
    <!-- 摘要信息 -->
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
