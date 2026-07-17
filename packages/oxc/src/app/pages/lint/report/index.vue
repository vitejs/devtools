<script setup lang="ts">
import FormCheckbox from '@vitejs/devtools-ui/components/Form/FormCheckbox.vue'
import VisualEmptyState from '@vitejs/devtools-ui/components/Visual/VisualEmptyState.vue'
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
        <button
          class="btn-action-sm cursor-pointer"
          aria-label="Reload sessions"
          @click="reloadSessions()"
        >
          <div class="i-lucide-refresh-cw" />
        </button>

        <p class="op-fade">Select a lint session to get started:</p>
      </div>

      <FormCheckbox v-model="hidePassed" label="Hide Passed" />
    </div>

    <template v-if="filteredSessionMetaList?.length > 0">
      <SessionCard v-for="meta in filteredSessionMetaList" :key="meta.timestamp" :meta="meta" />
    </template>

    <VisualEmptyState
      v-else
      class="w-full mt4"
      title="No sessions found"
      icon="i-ph-folder-simple-duotone"
    >
      <template #description>
        <div class="text-sm op-fade leading-7">
          <span>Oxc Inspector logs directory</span><code>.devtools-oxc</code> not found.
          <br />
          Run <code>npx @vitejs/devtools-oxc lint</code> to generate it first.
          <br />
          Read more:
          <NuxtLink
            to="https://github.com/yuyinws/oxc-inspector"
            external
            target="_blank"
            class="color-active"
          >
            https://github.com/yuyinws/oxc-inspector
          </NuxtLink>
        </div>
      </template>
    </VisualEmptyState>
  </div>
</template>

<style scoped>
code {
  --uno: bg-active rounded-sm px1 py0.5;
}
</style>
