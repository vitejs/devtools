<script setup lang="ts">
import ContainerCard from '@vitejs/devtools-ui/components/Container/ContainerCard.vue'
import DisplayFileIcon from '@vitejs/devtools-ui/components/Display/DisplayFileIcon.vue'
import DisplayDuration from '@vitejs/devtools-ui/components/Display/DisplayDuration.vue'
import OverlayModal from '@vitejs/devtools-ui/components/Overlay/OverlayModal.vue'
import type { OxcConfigFile, Summary } from '../../../src/types'

interface Props {
  summary: Summary
  totalIssues: number
  version: string
  config: OxcConfigFile[] | Record<string, unknown> | null
  timestamp: number
}

const props = defineProps<Props>()

const durationMs = computed(() => Math.round(props.summary.start_time * 1000))
const configFiles = computed<OxcConfigFile[]>(() => {
  if (Array.isArray(props.config)) return props.config
  if (!props.config) return []
  return [
    {
      tool: 'oxlint',
      format: 'json',
      path: '.oxlintrc.json',
      content: JSON.stringify(props.config, null, 2),
      source: 'oxc',
    },
  ]
})
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
          <span class="inline-flex items-center gap-1 font-mono hover:color-active">
            <span>v{{ version }}</span>
            <div class="i-ph-arrow-up-right" />
          </span>
        </NuxtLink>

        <div class="i-ph-gear text-lg" />

        <div class="font-medium">Oxlint Config</div>

        <div v-if="configFiles.length" class="flex flex-wrap items-center gap-1">
          <OverlayModal v-for="configFile in configFiles" :key="configFile.path">
            <template #trigger="{ open }">
              <button
                type="button"
                class="inline-flex max-w-full items-center gap-1 border border-base rounded px2 py1 text-sm font-mono hover:bg-active"
                :title="`Open ${configFile.path}`"
                @click="open"
              >
                <DisplayFileIcon class="flex-none" :filename="configFile.path" />
                <span class="truncate">{{ configFile.path }}</span>
                <div class="i-ph-arrow-up-right flex-none op-fade" />
              </button>
            </template>
            <template #title>
              <div class="flex items-center gap-1">
                <DisplayFileIcon class="flex-none" :filename="configFile.path" />
                <div>{{ configFile.path }}</div>
              </div>
            </template>
            <div class="w-150 max-w-full font-mono">
              <Shiki :code="configFile.content" :ext="`.${configFile.format}`" />
            </div>
          </OverlayModal>
        </div>
        <p v-else class="text-sm op-fade">No config found</p>

        <div class="i-ph-clock-duotone text-lg" />

        <div class="font-medium">Created At</div>

        <span class="inline-flex w-fit items-center font-mono">
          {{ new Date(timestamp).toLocaleString() }}
        </span>

        <div class="i-ph-timer-duotone text-lg" />

        <div class="font-medium">Lint Duration</div>

        <span class="inline-flex w-fit items-center font-mono">
          <DisplayDuration :duration="durationMs" />
        </span>

        <div class="i-ph-file-duotone text-lg" />

        <div class="font-medium">Checked Files</div>

        <span class="inline-flex w-fit items-center gap-1 font-mono">
          {{ summary.number_of_files }} files.
          <span class="text-red-600 dark:text-red-400 font-semibold"
            >{{ summary.files_with_issues }} with issues</span
          >
        </span>

        <div class="i-ph-warning-octagon-duotone text-lg" />

        <div class="font-medium">Issues</div>

        <span class="inline-flex w-fit items-center gap-1 font-mono">
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
