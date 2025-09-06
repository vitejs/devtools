<script setup lang="ts">
import type { BuildInfo } from '~~/node/rolldown/logs-manager'
import { NuxtLink } from '#components'

const props = defineProps<{
  sessionMode: 'list' | 'compare'
  sessions: BuildInfo[]
}>()
const emit = defineEmits<{
  (e: 'select', session: BuildInfo): void
}>()

function select(session: BuildInfo) {
  if (props.sessionMode === 'compare') {
    emit('select', session)
  }
}
</script>

<template>
  <div flex="~ col gap-2">
    <div v-for="session of sessions" :key="session.id" flex="~ row gap-2" relative>
      <slot name="left" :session="session" />
      <component
        :is="sessionMode === 'list' ? NuxtLink : 'div'"
        :to="`/session/${session.id}`"
        border="~ base rounded-md"
        :class="sessionMode === 'list' ? 'hover:bg-active' : ''"
        flex="~ col gap-1"
        px4 py3
        @click="select(session)"
      >
        <div flex="~ gap-1 items-center" font-mono op50 text-sm>
          <div i-ph-hash-duotone />
          {{ session.id }}
        </div>
        <div font-mono font-sm>
          {{ session.meta.cwd }}
        </div>
        <div v-if="session.meta.inputs[0]" flex="~ gap-1 items-center">
          <DisplayModuleId :id="session.meta.inputs[0].filename" :cwd="session.meta.cwd" />
          <DisplayBadge :text="session.meta.inputs[0].name || 'entry'" />
          <span v-if="session.meta.inputs.length > 1" op50 text-xs border="~ base rounded-md" px1 font-mono>
            +{{ session.meta.inputs.length - 1 }}
          </span>
        </div>
        <DisplayTimestamp :timestamp="session.timestamp" pt2 text-sm op50 />
      </component>
    </div>
  </div>
</template>
