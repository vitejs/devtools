<script setup lang="ts">
import ContainerCard from '@vitejs/devtools-ui/components/Container/ContainerCard.vue'
import type { Meta } from '../../../src/types'

const { meta } = defineProps<{
  meta: Meta
}>()

const failed = computed(() => {
  return meta.summary.files_with_issues > 0
})
</script>

<template>
  <NuxtLink class="w-full" :to="`/lint/report/${meta.timestamp}`">
    <ContainerCard class="p4 cursor-pointer hover:bg-active">
      <div class="flex justify-between gap-2 font-mono op-fade">
        <div class="flex items-center gap-1">
          <div class="i-ph-hash-duotone" />
          <span class="text-sm">{{ meta.timestamp }}</span>
        </div>

        {{ useTimeAgo(meta.timestamp) }}
      </div>

      <div class="flex justify-between items-center mt4">
        <span
          class="badge-color-gray inline-flex items-center gap-1 px2 py0.5 rounded border text-sm font-mono"
        >
          <div class="i-ph-file-duotone" />
          {{ meta.summary.number_of_files }}
        </span>

        <div v-if="failed" class="flex items-center gap-2">
          <span
            v-if="meta.summary.error_count > 0"
            class="badge-color-red inline-flex items-center gap-1 px2 py0.5 rounded border text-sm font-mono"
          >
            <div class="i-ph-x-circle-duotone" />
            {{ meta.summary.error_count }}
          </span>

          <span
            v-if="meta.summary.warning_count > 0"
            class="badge-color-amber inline-flex items-center gap-1 px2 py0.5 rounded border text-sm font-mono"
          >
            <div class="i-ph-warning-circle-duotone" />
            {{ meta.summary.warning_count }}
          </span>
        </div>

        <span
          v-else
          class="badge-color-green inline-flex items-center gap-1 px2 py0.5 rounded border text-sm font-mono"
        >
          <div class="i-ph-check-circle-duotone" />
          Passed
        </span>
      </div>
    </ContainerCard>
  </NuxtLink>
</template>
