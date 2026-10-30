<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import { onKeyStroke } from '@vueuse/core'
import { computed, reactive, watch } from 'vue'
import { useRpc } from '#imports'
import { getFileTypeFromName } from '~/utils/icon'

interface ModuleSide {
  session: string
  module: string
}

const props = defineProps<{
  previous?: ModuleSide
  current?: ModuleSide
  side: 'previous' | 'current'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:side', side: 'previous' | 'current'): void
}>()

const rpc = useRpc()

// Lazily load and cache the full SessionContext for each session id.
const sessionCache = new Map<string, SessionContext>()
const contexts = reactive<Record<string, SessionContext | undefined>>({})

async function loadSession(id: string) {
  if (sessionCache.has(id)) {
    contexts[id] = sessionCache.get(id)
    return
  }
  const summary = await rpc.value.call('vite:rolldown:get-session-summary', { session: id })
  const context: SessionContext = {
    id,
    meta: summary.meta!,
    modulesList: summary.modules.map(mod => ({
      id: mod.id,
      fileType: getFileTypeFromName(mod.id).name,
      imports: mod.imports ?? [],
      importers: mod.importers ?? [],
      buildMetrics: mod.build_metrics,
    })),
    buildDuration: summary.build_duration,
  }
  sessionCache.set(id, context)
  contexts[id] = context
}

const activeSide = computed(() => props.side === 'current' ? props.current : props.previous)
const activeSession = computed(() => activeSide.value ? contexts[activeSide.value.session] : undefined)

watch(activeSide, (sideValue) => {
  if (sideValue)
    loadSession(sideValue.session)
}, { immediate: true })

onKeyStroke('Escape', (e) => {
  e.preventDefault()
  emit('close')
})
</script>

<template>
  <div
    class="fixed right-0 bottom-0 top-20 left-20 z-panel-content bg-glass border-l border-t border-base rounded-tl-xl of-hidden"
  >
    <DataModuleDetailsLoader
      v-if="activeSide && activeSession"
      :key="`${activeSide.session}:${activeSide.module}`"
      :module="activeSide.module"
      :session="activeSession"
      @close="emit('close')"
    />
    <VisualLoading v-else />

    <!-- A/B switch floats above the loader, only meaningful when both sides exist -->
    <div
      v-if="previous && current"
      class="absolute top-2 left-1/2 translate-x--1/2 z-panel-content flex items-center gap-1 p0.5 bg-glass border border-base rounded-lg"
    >
      <button
        type="button"
        class="px3 py1 rounded-md text-sm"
        :class="side === 'previous' ? 'bg-active font-600' : 'op60 hover:op100'"
        @click="emit('update:side', 'previous')"
      >
        Session A
      </button>
      <button
        type="button"
        class="px3 py1 rounded-md text-sm"
        :class="side === 'current' ? 'bg-active font-600' : 'op60 hover:op100'"
        @click="emit('update:side', 'current')"
      >
        Session B
      </button>
    </div>
  </div>
</template>
