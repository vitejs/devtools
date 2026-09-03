<script setup lang="ts">
import VisualEmptyState from '@vitejs/devtools-ui/components/Visual/VisualEmptyState.vue'
import { ref } from 'vue'

const runFormatOpen = ref(false)
</script>

<template>
  <div class="flex flex-col gap-4 max-w-180 mx-auto p6">
    <div class="flex justify-between items-start w-full">
      <Back to="/" />
      <div class="flex items-center gap-3">
        <button class="btn-action-sm" @click="runFormatOpen = true">
          <div class="i-ph-play-duotone" />
          Run Format
        </button>
        <button class="btn-action-sm cursor-pointer">
          <div class="i-lucide-refresh-cw" />
          Refresh
        </button>
      </div>
    </div>

    <VisualEmptyState
      class="w-full mt4 border border-base rounded-lg border-dashed"
      title="No format results found"
      icon="i-ph-folder-simple-duotone"
    >
      <template #description>
        <div class="text-sm op-fade leading-7">Run format to check the project files.</div>
      </template>
    </VisualEmptyState>

    <RunOxfmtDialog v-model:open="runFormatOpen" />
  </div>
</template>
