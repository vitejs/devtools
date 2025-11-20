<!-- eslint-disable vue/no-mutating-props -->
<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import type { TerminalState } from '../state/terminals'
import { useEventListener } from '@vueuse/core'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { markRaw, onMounted, ref } from 'vue'

const props = defineProps<{
  context: DocksContext
  terminal: TerminalState
}>()

const container = ref<HTMLElement>()
let term: Terminal

onMounted(async () => {
  term = markRaw(new Terminal({
    convertEol: true,
    cols: 80,
    screenReaderMode: true,
  }))
  const fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(container.value!)
  fitAddon.fit()

  useEventListener(window, 'resize', () => {
    fitAddon.fit()
  })

  if (props.terminal.buffer == null) {
    const { buffer } = await props.context.rpc.$call('vite:internal:terminals:read', props.terminal.info.id)
    props.terminal.buffer = markRaw(buffer)
    for (const chunk of buffer)
      term.write(chunk)
  }

  props.terminal.terminal = term
})

// async function clear() {
//   rpc.runTerminalAction(await ensureDevAuthToken(), props.id, 'clear')
//   term?.clear()
// }

// async function restart() {
//   rpc.runTerminalAction(await ensureDevAuthToken(), props.id, 'restart')
// }

// async function terminate() {
//   rpc.runTerminalAction(await ensureDevAuthToken(), props.id, 'terminate')
// }
</script>

<template>
  <div ref="container" class="h-full w-full of-auto bg-black" />
  <!-- <div border="t base" flex="~ gap-2" items-center p2>
    <NButton title="Clear" icon="i-carbon-clean" :border="false" @click="clear()" />
    <NButton v-if="info?.restartable" title="Restart" icon="carbon-renew" :border="false" @click="restart()" />
    <NButton v-if="info?.terminatable" title="Terminate" icon="carbon-delete" :border="false" @click="terminate()" />
    <span text-sm op50>{{ info?.description }}</span>
  </div> -->
</template>
