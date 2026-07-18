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
          <span inline-flex items-center gap-1 font-mono hover:color-active>
            <span>v{{ version }}</span>
            <div i-ph-arrow-up-right />
          </span>
        </NuxtLink>

        <div i-ph-gear text-lg />

        <div font-medium>Oxlint Config</div>

        <div v-if="configFiles.length" flex="~ wrap" items-center gap-1>
          <OverlayModal v-for="configFile in configFiles" :key="configFile.path">
            <template #trigger="{ open }">
              <button
                type="button"
                inline-flex
                max-w-full
                items-center
                gap-1
                border="~ base rounded"
                px2
                py1
                text-sm
                font-mono
                hover:bg-active
                :title="`Open ${configFile.path}`"
                @click="open"
              >
                <DisplayFileIcon flex-none :filename="configFile.path" />
                <span truncate>{{ configFile.path }}</span>
                <div i-ph-arrow-up-right flex-none op-fade />
              </button>
            </template>
            <template #title>
              <div flex items-center gap-1>
                <DisplayFileIcon flex-none :filename="configFile.path" />
                <div>{{ configFile.path }}</div>
              </div>
            </template>
            <div w-150 max-w-full font-mono>
              <Shiki :code="configFile.content" :ext="`.${configFile.format}`" />
            </div>
          </OverlayModal>
        </div>
        <p v-else text-sm op-fade>No config found</p>

        <div i-ph-clock-duotone text-lg />

        <div font-medium>Created At</div>

        <span inline-flex w-fit items-center font-mono>
          {{ new Date(timestamp).toLocaleString() }}
        </span>

        <div i-ph-timer-duotone text-lg />

        <div font-medium>Lint Duration</div>

        <span inline-flex w-fit items-center font-mono>
          <DisplayDuration :duration="durationMs" />
        </span>

        <div i-ph-file-duotone text-lg />

        <div font-medium>Checked Files</div>

        <span inline-flex w-fit items-center gap-1 font-mono>
          {{ summary.number_of_files }} files.
          <span text-red-600 dark:text-red-400 font-semibold
            >{{ summary.files_with_issues }} with issues</span
          >
        </span>

        <div i-ph-warning-octagon-duotone text-lg />

        <div font-medium>Issues</div>

        <span inline-flex w-fit items-center gap-1 font-mono>
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
