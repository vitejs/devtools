<script setup lang="ts">
import type { Summary } from '../../../src/types'

interface Props {
  summary: Summary
  totalIssues: number
  version: string
  config: object | null
  timestamp: number
}

const props = defineProps<Props>()

const durationData = computed(() => {
  const value = Math.round(props.summary.start_time * 1000)

  if (value < 100) {
    return {
      value,
      color: 'color-scale-low',
    }
  }

  if (value < 500) {
    return {
      value,
      color: 'color-scale-medium',
    }
  }

  if (value < 1000) {
    return {
      value,
      color: 'color-scale-high',
    }
  }

  return {
    value,
    color: 'color-scale-critical',
  }
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <UCard class="p-4">
      <div class="grid grid-cols-[max-content_160px_2fr] gap-2 items-center">
        <UIcon name="ph:anchor" class="w-5 h-5" />

        <div class="font-medium">Oxlint Version</div>

        <NuxtLink
          :to="`https://github.com/oxc-project/oxc/releases/tag/oxlint_v${version}`"
          external
          target="_blank"
          class="hover:text-primary hover:font-semibold"
        >
          <UBadge
            class="hover:text-primary hover:font-semibold"
            variant="outline"
            color="neutral"
            size="lg"
            trailing-icon="ph:arrow-up-right"
          >
            <span class="font-mono ml-1">v{{ version }}</span>
          </UBadge>
        </NuxtLink>

        <UIcon name="ph:gear" class="w-5 h-5" />

        <div class="font-medium">Oxlint Config</div>

        <UModal :ui="{ content: 'max-w-2xl' }">
          <template #title>
            <div class="flex items-center gap-1">
              <u-icon class="flex-shrink-0" name="vscode-icons:file-type-oxlint" />
              <div>.oxlintrc.json</div>
            </div>
          </template>

          <UBadge
            class="hover:text-primary hover:font-semibold w-fit cursor-pointer"
            variant="outline"
            color="neutral"
            size="lg"
            trailing-icon="ph:arrow-up-right"
          >
            <span class="font-mono ml-1">.oxlintrc.json</span>
          </UBadge>
          <template #body>
            <div v-if="config" class="w-200">
              <Shiki :code="JSON.stringify(config, null, 2)" ext=".json" />
            </div>
            <div v-else>
              <p class="text-sm text-gray-500">No config found</p>
            </div>
          </template>
        </UModal>

        <UIcon name="ph:clock-duotone" class="w-5 h-5" />

        <div class="font-medium">Created At</div>

        <UBadge class="w-fit font-mono" size="lg" variant="outline" color="neutral">
          {{ new Date(timestamp).toLocaleString() }}
        </UBadge>

        <UIcon name="ph:timer-duotone" class="w-5 h-5" />

        <div class="font-medium">Lint Duration</div>

        <UBadge
          class="w-fit font-mono"
          size="lg"
          variant="outline"
          color="neutral"
          :class="durationData.color"
        >
          <span> {{ durationData.value }}</span>
          <span class="text-xs opacity-[75]">ms</span>
        </UBadge>

        <UIcon name="ph:file-duotone" class="w-5 h-5" />

        <div class="font-medium">Checked Files</div>

        <UBadge class="w-fit font-mono" size="lg" variant="outline" color="neutral">
          {{ summary.number_of_files }} files.
          <span class="text-red-600 dark:text-red-400 font-semibold"
            >{{ summary.files_with_issues }} with issues</span
          >
        </UBadge>

        <UIcon name="ph:warning-octagon-duotone" class="w-5 h-5" />

        <div class="font-medium">Issues</div>

        <UBadge class="w-fit font-mono" size="lg" variant="outline" color="neutral">
          {{ totalIssues }} issues.
          <span v-if="summary.error_count > 0" class="text-red-600 dark:text-red-400 font-semibold"
            >{{ summary.error_count }} errors</span
          >
          <span
            v-if="summary.warning_count > 0"
            class="text-yellow-600 dark:text-yellow-400 font-semibold"
            >{{ summary.warning_count }} warnings</span
          >
        </UBadge>
      </div>
    </UCard>
  </div>
</template>
