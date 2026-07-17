<script setup lang="ts">
import ContainerCard from '@vitejs/devtools-ui/components/Container/ContainerCard.vue'
import type { LintResultMeta } from '../../../src/types'

const { result } = defineProps<{
  result: LintResultMeta
}>()

const emit = defineEmits<{
  delete: [resultId: string]
}>()

const failed = computed(() => result.summary.files_with_issues > 0)
</script>

<template>
  <ContainerCard relative p4 hover:bg-active>
    <NuxtLink
      absolute
      inset-0
      :to="{ path: '/oxlint/lint', query: { result: String(result.timestamp) } }"
      :aria-label="`Open lint result ${result.timestamp}`"
    />

    <div relative pointer-events-none>
      <div flex justify-between gap-2 font-mono op-fade>
        <div flex items-center gap-1>
          <div i-ph-hash-duotone />
          <span text-sm>{{ result.timestamp }}</span>
        </div>

        <div flex items-center gap-2>
          {{ useTimeAgo(result.timestamp) }}
          <button
            type="button"
            pointer-events-auto
            hover:text-red
            :aria-label="`Delete lint result ${result.timestamp}`"
            @click="emit('delete', String(result.timestamp))"
          >
            <div i-ph-trash-duotone />
          </button>
        </div>
      </div>

      <div flex justify-between items-center mt4>
        <span
          badge-color-gray
          inline-flex
          items-center
          gap-1
          px2
          py0.5
          rounded
          border
          text-sm
          font-mono
        >
          <div i-ph-file-duotone />
          {{ result.summary.number_of_files }}
        </span>

        <div v-if="failed" flex items-center gap-2>
          <span
            v-if="result.summary.error_count > 0"
            badge-color-red
            inline-flex
            items-center
            gap-1
            px2
            py0.5
            rounded
            border
            text-sm
            font-mono
          >
            <div i-ph-x-circle-duotone />
            {{ result.summary.error_count }}
          </span>

          <span
            v-if="result.summary.warning_count > 0"
            badge-color-amber
            inline-flex
            items-center
            gap-1
            px2
            py0.5
            rounded
            border
            text-sm
            font-mono
          >
            <div i-ph-warning-circle-duotone />
            {{ result.summary.warning_count }}
          </span>
        </div>

        <span
          v-else
          badge-color-green
          inline-flex
          items-center
          gap-1
          px2
          py0.5
          rounded
          border
          text-sm
          font-mono
        >
          <div i-ph-check-circle-duotone />
          Passed
        </span>
      </div>
    </div>
  </ContainerCard>
</template>
