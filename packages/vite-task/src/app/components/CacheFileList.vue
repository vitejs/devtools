<script setup lang="ts">
import type { PathFingerprint } from '../../shared/types'
import DisplayExpandableContainer from '@vitejs/devtools-ui/components/Display/DisplayExpandableContainer.vue'
import DisplayFileIcon from '@vitejs/devtools-ui/components/Display/DisplayFileIcon.vue'
import TaskFilePath from './TaskFilePath.vue'

defineProps<{
  label: 'Inputs' | 'Outputs'
  files: { path: string, fingerprint?: PathFingerprint }[]
}>()
</script>

<template>
  <details open class="file-section">
    <summary class="cursor-pointer text-sm">
      <span class="op60">{{ label }} ({{ files.length }})</span>
    </summary>
    <DisplayExpandableContainer :list="files" class="mt2">
      <template #default="{ items }">
        <ul :aria-label="label" class="list-none m0 p0 flex flex-col gap1">
          <li
            v-for="{ path, fingerprint } in items" :key="path"
            class="flex items-start gap2 rounded border border-base px2 py1 text-sm hover:bg-active"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap1.5">
                <span v-if="fingerprint?.type === 'dir'" class="i-ph-folder-duotone text-amber shrink-0" aria-label="Directory" />
                <DisplayFileIcon v-else :filename="path" />
                <TaskFilePath :path="path" compact />
              </div>
              <div v-if="fingerprint && (fingerprint.type !== 'file' || fingerprint.mayBeMissing)" class="ml5 flex gap1 text-xs op60">
                <span v-if="fingerprint.type !== 'file'">{{ fingerprint.type }}</span>
                <span v-if="fingerprint.mayBeMissing">may be missing</span>
              </div>
              <details v-if="fingerprint?.entries?.length" class="ml5 mt1 text-xs">
                <summary class="cursor-pointer op70">
                  {{ fingerprint.entries.length }} directory entries
                </summary>
                <div v-for="(entry, index) in fingerprint.entries" :key="index" class="mt1">
                  <TaskFilePath :path="entry" compact />
                </div>
              </details>
            </div>
            <code v-if="fingerprint?.hash" v-tooltip="fingerprint.hash" class="shrink-0 text-xs leading-5 op60">
              <span class="sr-only">Hash </span>{{ fingerprint.hash.slice(0, 12) }}
            </code>
          </li>
        </ul>
      </template>
    </DisplayExpandableContainer>
  </details>
</template>

<style scoped>
.file-section + .file-section { margin-top: 0.75rem; }
</style>
