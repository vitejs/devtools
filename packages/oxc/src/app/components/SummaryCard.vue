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
  <div class="flex flex-col gap-2">
    <ContainerCard class="p4">
      <div class="grid grid-cols-[max-content_160px_2fr] gap-2 items-center">
        <div class="i-ph-anchor text-lg" />

        <div class="font-medium">Oxlint Version</div>

        <NuxtLink
          :to="`https://github.com/oxc-project/oxc/releases/tag/oxlint_v${version}`"
          external
          target="_blank"
          class="w-fit"
        >
          <span
            class="badge-color-gray inline-flex items-center gap-1 px2 py1 rounded border font-mono hover:color-active"
          >
            <span class="ml1">v{{ version }}</span>
            <div class="i-ph-arrow-up-right" />
          </span>
        </NuxtLink>

        <div class="i-ph-gear text-lg" />

        <div class="font-medium">Oxlint Config</div>

        <OverlayModal>
          <template #trigger="{ open }">
            <span
              class="badge-color-gray inline-flex w-fit items-center gap-1 px2 py1 rounded border font-mono cursor-pointer hover:color-active"
              @click="open"
            >
              <span class="ml1">.oxlintrc.json</span>
              <div class="i-ph-arrow-up-right" />
            </span>
          </template>
          <template #title>
            <div class="flex items-center gap-1">
              <div class="i-vscode-icons:file-type-oxlint flex-none" />
              <div>.oxlintrc.json</div>
            </div>
          </template>
          <div v-if="config" class="w-150 max-w-full font-mono">
            <Shiki :code="JSON.stringify(config, null, 2)" ext=".json" />
          </div>
          <div v-else>
            <p class="text-sm op-fade">No config found</p>
          </div>
        </OverlayModal>

        <div class="i-ph-clock-duotone text-lg" />

        <div class="font-medium">Created At</div>

        <span
          class="badge-color-gray inline-flex w-fit items-center px2 py1 rounded border font-mono"
        >
          {{ new Date(timestamp).toLocaleString() }}
        </span>

        <div class="i-ph-timer-duotone text-lg" />

        <div class="font-medium">Lint Duration</div>

        <span
          class="badge-color-gray inline-flex w-fit items-center px2 py1 rounded border font-mono"
        >
          <DisplayDuration :duration="durationMs" />
        </span>

        <div class="i-ph-file-duotone text-lg" />

        <div class="font-medium">Checked Files</div>

        <span
          class="badge-color-gray inline-flex w-fit items-center gap-1 px2 py1 rounded border font-mono"
        >
          {{ summary.number_of_files }} files.
          <span class="text-red-600 dark:text-red-400 font-semibold"
            >{{ summary.files_with_issues }} with issues</span
          >
        </span>

        <div class="i-ph-warning-octagon-duotone text-lg" />

        <div class="font-medium">Issues</div>

        <span
          class="badge-color-gray inline-flex w-fit items-center gap-1 px2 py1 rounded border font-mono"
        >
          {{ totalIssues }} issues.
          <span v-if="summary.error_count > 0" class="text-red-600 dark:text-red-400 font-semibold"
            >{{ summary.error_count }} errors</span
          >
          <span
            v-if="summary.warning_count > 0"
            class="text-yellow-600 dark:text-yellow-400 font-semibold"
            >{{ summary.warning_count }} warnings</span
          >
        </span>
      </div>
    </ContainerCard>
  </div>
</template>
