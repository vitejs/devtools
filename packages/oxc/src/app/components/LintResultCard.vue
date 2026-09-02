<script setup lang="ts">
import ContainerCard from '@vitejs/devtools-ui/components/Container/ContainerCard.vue'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayTimestamp from '@vitejs/devtools-ui/components/Display/DisplayTimestamp.vue'
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
  <ContainerCard class="relative px4 py3 cursor-pointer hover:bg-active">
    <NuxtLink
      class="absolute inset-0"
      :to="`/oxlint/lint/${result.timestamp}`"
      :aria-label="`Open lint result ${result.timestamp}`"
    />

    <div class="relative pointer-events-none flex flex-col gap-1">
      <div class="flex items-center justify-between gap-2">
        <div class="flex gap-1 items-center font-mono op50 text-sm">
          <div class="i-ph-hash-duotone" />
          {{ result.timestamp }}
        </div>

        <div class="flex gap-1 items-center">
          <template v-if="failed">
            <DisplayBadge
              v-if="result.summary.error_count > 0"
              :color="false"
              class="badge-color-red inline-flex items-center gap-1"
            >
              <div class="i-ph-x-circle-duotone" />
              {{ result.summary.error_count }}
            </DisplayBadge>

            <DisplayBadge
              v-if="result.summary.warning_count > 0"
              :color="false"
              class="badge-color-amber inline-flex items-center gap-1"
            >
              <div class="i-ph-warning-circle-duotone" />
              {{ result.summary.warning_count }}
            </DisplayBadge>
          </template>

          <DisplayBadge
            v-else
            :color="false"
            class="badge-color-green inline-flex items-center gap-1"
          >
            <div class="i-ph-check-circle-duotone" />
            <span>Passed</span>
          </DisplayBadge>
        </div>
      </div>

      <div class="flex items-center justify-between pt2 text-sm op50">
        <DisplayTimestamp :timestamp="result.timestamp" />
        <button
          type="button"
          class="pointer-events-auto flex items-center gap-1 px2 py1 rounded hover:text-red hover:bg-active"
          :aria-label="`Delete lint result ${result.timestamp}`"
          @click="emit('delete', String(result.timestamp))"
        >
          <div class="i-ph-trash-duotone" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  </ContainerCard>
</template>
