<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { TerminalState } from '../state/terminals'
import { shallowRef } from 'vue'
import { useTerminals } from '../state/terminals'
import ViewBuiltinTerminalPanel from './ViewBuiltinTerminalPanel.vue'

const props = defineProps<{
  context: DocksContext
}>()

const terminals = useTerminals(props.context)
const selectedTerminal = shallowRef<TerminalState | null>(null)
</script>

<template>
  <div class="w-full h-full grid-cols-[max-content_1fr]">
    <div class="border-base border-b">
      <button
        v-for="terminal of terminals.values()"
        :key="terminal.info.id"
        class="px3 py2 border-r border-base hover:bg-active"
        @click="selectedTerminal = terminal"
      >
        {{ terminal.info.title }}
      </button>
    </div>
    <div class="h-full flex relative">
      <ViewBuiltinTerminalPanel
        v-if="selectedTerminal"
        :context
        :terminal="selectedTerminal"
      />
      <div v-else class="flex items-center justify-center h-full text-center">
        Select a terminal tab to start
      </div>
    </div>
  </div>
</template>
