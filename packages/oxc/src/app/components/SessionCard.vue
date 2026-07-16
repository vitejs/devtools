<script setup lang="ts">
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
    <UCard class="w-full p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
      <div class="flex justify-between gap-2 font-mono opacity-50">
        <div class="flex items-center gap-1">
          <u-icon name="ph:hash-duotone" class="w-4 h-4" />
          <span class="text-sm">{{ meta.timestamp }} </span>
        </div>

        {{ useTimeAgo(meta.timestamp) }}
      </div>

      <div class="flex justify-between mt-4">
        <UBadge color="neutral" variant="outline" icon="ph:file-duotone">
          {{ meta.summary.number_of_files }}
        </UBadge>

        <div v-if="failed" class="flex items-center gap-2 text-red-600 dark:text-red-400">
          <UBadge
            v-if="meta.summary.error_count > 0"
            class="w-fit"
            color="error"
            variant="outline"
            icon="ph:x-circle-duotone"
          >
            {{ meta.summary.error_count }}
          </UBadge>

          <UBadge
            v-if="meta.summary.warning_count > 0"
            class="w-fit"
            color="warning"
            variant="outline"
            icon="ph:warning-circle-duotone"
          >
            {{ meta.summary.warning_count }}
          </UBadge>
        </div>

        <UBadge
          v-else
          class="w-fit"
          color="success"
          variant="outline"
          icon="ph:check-circle-duotone"
        >
          Passed
        </UBadge>
      </div>
    </UCard>
  </NuxtLink>
</template>
