<script setup lang="ts">
import ContainerCard from '@vitejs/devtools-ui/components/Container/ContainerCard.vue'
import DisplayDuration from '@vitejs/devtools-ui/components/Display/DisplayDuration.vue'
import OverlayModal from '@vitejs/devtools-ui/components/Overlay/OverlayModal.vue'
import type { Summary } from '../../../src/types'

interface Props {
  summary: Summary
  totalIssues: number
  version: string
  config: object | null
  timestamp: number
}

const props = defineProps<Props>()

const durationMs = computed(() => Math.round(props.summary.start_time * 1000))
</script>

<template>
  <div flex="~ col" gap-2>
    <ContainerCard p4>
      <div grid="~ cols-[max-content_160px_2fr]" gap-2 items-center>
        <div i-ph-anchor text-lg />

        <div font-medium>Oxlint Version</div>

        <NuxtLink
          :to="`https://github.com/oxc-project/oxc/releases/tag/oxlint_v${version}`"
          external
          target="_blank"
          w-fit
        >
          <span
            badge-color-gray
            inline-flex
            items-center
            gap-1
            px2
            py1
            rounded
            border
            font-mono
            hover:color-active
          >
            <span ml1>v{{ version }}</span>
            <div i-ph-arrow-up-right />
          </span>
        </NuxtLink>

        <div i-ph-gear text-lg />

        <div font-medium>Oxlint Config</div>

        <OverlayModal>
          <template #trigger="{ open }">
            <span
              badge-color-gray
              inline-flex
              w-fit
              items-center
              gap-1
              px2
              py1
              rounded
              border
              font-mono
              cursor-pointer
              hover:color-active
              @click="open"
            >
              <span ml1>.oxlintrc.json</span>
              <div i-ph-arrow-up-right />
            </span>
          </template>
          <template #title>
            <div flex items-center gap-1>
              <div i-vscode-icons:file-type-oxlint flex-none />
              <div>.oxlintrc.json</div>
            </div>
          </template>
          <div v-if="config" w-150 max-w-full font-mono>
            <Shiki :code="JSON.stringify(config, null, 2)" ext=".json" />
          </div>
          <div v-else>
            <p text-sm op-fade>No config found</p>
          </div>
        </OverlayModal>

        <div i-ph-clock-duotone text-lg />

        <div font-medium>Created At</div>

        <span badge-color-gray inline-flex w-fit items-center px2 py1 rounded border font-mono>
          {{ new Date(timestamp).toLocaleString() }}
        </span>

        <div i-ph-timer-duotone text-lg />

        <div font-medium>Lint Duration</div>

        <span badge-color-gray inline-flex w-fit items-center px2 py1 rounded border font-mono>
          <DisplayDuration :duration="durationMs" />
        </span>

        <div i-ph-file-duotone text-lg />

        <div font-medium>Checked Files</div>

        <span
          badge-color-gray
          inline-flex
          w-fit
          items-center
          gap-1
          px2
          py1
          rounded
          border
          font-mono
        >
          {{ summary.number_of_files }} files.
          <span text-red-600 dark:text-red-400 font-semibold
            >{{ summary.files_with_issues }} with issues</span
          >
        </span>

        <div i-ph-warning-octagon-duotone text-lg />

        <div font-medium>Issues</div>

        <span
          badge-color-gray
          inline-flex
          w-fit
          items-center
          gap-1
          px2
          py1
          rounded
          border
          font-mono
        >
          {{ totalIssues }} issues.
          <span v-if="summary.error_count > 0" text-red-600 dark:text-red-400 font-semibold
            >{{ summary.error_count }} errors</span
          >
          <span v-if="summary.warning_count > 0" text-yellow-600 dark:text-yellow-400 font-semibold
            >{{ summary.warning_count }} warnings</span
          >
        </span>
      </div>
    </ContainerCard>
  </div>
</template>
