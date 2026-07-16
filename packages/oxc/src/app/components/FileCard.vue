<script setup lang="ts">
import type { FileData } from '../../../src/types'
import { getFileIcon } from '~/composables/useFileUtils'

interface Props {
  file: FileData
}

const props = defineProps<Props>()

// Get the file icon
const fileIcon = computed(() => getFileIcon(props.file.filename))

const rpc = useRpc()

function handleOpenInEditor() {
  rpc.value.call('devtools-oxc:open-in-editor', props.file.filename)
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2" @click="handleOpenInEditor">
        <u-icon class="flex-shrink-0" :name="fileIcon" />
        <span
          class="truncate dark:text-neutral-300 text-neutral-700 cursor-pointer hover:underline font-mono"
        >
          {{ file.filename }}
        </span>
      </div>
    </template>

    <div class="relative font-mono">
      <!-- Issue list -->
      <div v-if="file.lines.length > 0">
        <LineError
          v-for="lineData in file.lines"
          :key="`${file.filename}-${lineData.line}`"
          :line-data="lineData"
          :filename="file.filename"
          :source="file.source"
        />
      </div>
    </div>
  </UCard>
</template>
