<script setup lang="ts">
import type { BuildInfo } from '~~/node/rolldown/logs-manager'
import { computed, ref } from 'vue'

const sessionMode = ref<'list' | 'compare'>('compare')

const modeList = [
  {
    label: 'Session List',
    icon: 'i-carbon-list',
    value: 'list',
  },
  {
    label: 'Session Compare',
    icon: 'i-carbon-compare',
    value: 'compare',
  },
] as const

const selectedSessions = ref<BuildInfo[]>([])
const selectedSessionIds = computed(() => {
  return selectedSessions.value.map(session => session.id).sort()
})
const selectedSessionEntries = computed(() => {
  return selectedSessions.value.map(session => session.meta.inputs[0]?.filename ?? '')
})

function selectSession(session: BuildInfo) {
  if (selectedSessionIds.value.includes(session.id)) {
    selectedSessions.value = selectedSessions.value.filter(s => s.id !== session.id)
  }
  else {
    selectedSessions.value = [...selectedSessions.value, session]
  }
}
</script>

<template>
  <div p4 flex="~ col gap-4" items-center justify-center relative>
    <VisualLogoBanner />
    <div fixed top-5 right-5 flex="~ col gap2">
      <div flex="~ row justify-around" w20 h8 border="~ base rounded-8" of-hidden>
        <button v-for="mode in modeList" :key="mode.value" :title="mode.label" flex-1 op50 flex="~ items-center justify-center" :class="{ 'bg-active text-base op100!': sessionMode === mode.value }" hover="bg-active text-base op100!" @click="sessionMode = mode.value">
          <span :class="mode.icon" class="text-sm" />
        </button>
      </div>
    </div>
    <p op50>
      {{ sessionMode === 'list' ? 'Select a build session to get started:' : 'Select 2 sessions to compare:' }}
    </p>
    <div relative flex="~ col gap3 items-center">
      <PanelSessionSelector
        :session-mode="sessionMode"
        :selected-entries="selectedSessionEntries"
        :selected-session-ids="selectedSessionIds"
      >
        <template #left="{ session }">
          <input
            v-if="sessionMode === 'compare'"
            class="absolute top-50% translate-y--50% left--5"
            type="checkbox"
            mr1
            @change="selectSession(session)"
          >
        </template>
      </PanelSessionSelector>
      <NuxtLink v-if="selectedSessions.length === 2 && sessionMode === 'compare'" tag="button" :to="`/compare/${selectedSessionIds.join('/')}`" btn-action rounded-8 text-3 flex="~ justify-center" w30 h8>
        Compare
      </NuxtLink>
    </div>
  </div>
</template>
