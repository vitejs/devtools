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
  <NuxtLink w-full :to="`/lint/report/${meta.timestamp}`">
    <ContainerCard p4 cursor-pointer hover:bg-active>
      <div flex justify-between gap-2 font-mono op-fade>
        <div flex items-center gap-1>
          <div i-ph-hash-duotone />
          <span text-sm>{{ meta.timestamp }}</span>
        </div>

        {{ useTimeAgo(meta.timestamp) }}
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
          {{ meta.summary.number_of_files }}
        </span>

        <div v-if="failed" flex items-center gap-2>
          <span
            v-if="meta.summary.error_count > 0"
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
            {{ meta.summary.error_count }}
          </span>

          <span
            v-if="meta.summary.warning_count > 0"
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
            {{ meta.summary.warning_count }}
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
    </ContainerCard>
  </NuxtLink>
</template>
