<script setup lang="ts">
import DisplayFileIcon from '@vitejs/devtools-ui/components/Display/DisplayFileIcon.vue'
import ContainerCard from '@vitejs/devtools-ui/components/Container/ContainerCard.vue'
import type { FileData } from '../../../src/types'

const props = defineProps<{
  file: FileData
}>()

const rpc = useRpc()

function handleOpenInEditor() {
  rpc.value.call('devtools-oxc:open-in-editor', props.file.filename)
}
</script>

<template>
  <ContainerCard>
    <template #header>
      <div class="flex items-center gap-2 cursor-pointer" @click="handleOpenInEditor">
        <DisplayFileIcon class="flex-none" :filename="file.filename" />
        <span class="truncate color-base hover:underline font-mono">
          {{ file.filename }}
        </span>
      </div>
    </template>

    <div class="relative font-mono">
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
  </ContainerCard>
</template>
