<script setup lang="ts">
import { useAsyncState, useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'
import { useRpc } from '#imports'

const rpc = useRpc()

const { state: sessionMetaList, execute: reloadSessions } = useAsyncState(
  () => rpc.value.call('devtools-oxc:list-lint-session'),
  [],
)

const hidePassed = useLocalStorage('hidePassed', false)

const filteredSessionMetaList = computed(() => {
  return (
    sessionMetaList.value?.filter(
      meta => !hidePassed.value || meta.summary.files_with_issues > 0,
    ) || []
  )
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <Back />
    <div class="flex justify-between items-center w-full">
      <div class="flex items-center gap-2">
        <UButton
          size="sm"
          class="cursor-pointer"
          icon="lucide:refresh-cw"
          color="neutral"
          variant="outline"
          @click="reloadSessions()"
        />

        <p class="opacity-50">Select a lint session to get started:</p>
      </div>

      <UCheckbox v-model="hidePassed" color="success" label="Hide Passed" />
    </div>

    <template v-if="filteredSessionMetaList?.length > 0">
      <SessionCard v-for="meta in filteredSessionMetaList" :key="meta.timestamp" :meta="meta" />
    </template>

    <UEmpty v-else class="w-full mt-4" title="No sessions found" icon="i-ph-folder-simple-duotone">
      <template #description>
        <div class="text-sm text-neutral-500 leading-7">
          <span>Oxc Inspector logs directory</span><code>.devtools-oxc</code> not found.
          <br />
          Run <code>npx @vitejs/devtools-oxc lint</code> to generate it first.
          <br />
          Read more:
          <NuxtLink
            to="https://github.com/yuyinws/oxc-inspector"
            external
            target="_blank"
            class="text-primary-500"
          >
            https://github.com/yuyinws/oxc-inspector
          </NuxtLink>
        </div>
      </template>
    </UEmpty>
  </div>
</template>

<style scoped>
@reference '~/assets/css/main.css';

code {
  @apply bg-neutral-100 dark:bg-neutral-800 rounded-sm px-1 py-0.5;
}
</style>
