<script setup lang="ts">
import type { BuildInfo } from '~~/node/rolldown/logs-manager'
import { useRpc } from '#imports'
import { computed, ref } from 'vue'

const sessionMode = ref<'list' | 'compare'>('list')

const modeList = [
  {
    label: 'Session List',
    icon: 'i-ph-list-bullets-duotone',
    value: 'list',
  },
  {
    label: 'Session Compare',
    icon: 'i-ph-git-diff-duotone',
    value: 'compare',
  },
] as const

const selectedSessions = ref<BuildInfo[]>([])
const selectedSessionIds = computed(() => {
  return selectedSessions.value.map(session => session.id).sort()
})
const normalizedSelectedSessions = computed(() => {
  const sortedSessions = [...selectedSessions.value].sort((a, b) => a.timestamp - b.timestamp)
  return sortedSessions.map((session, index) => ({
    ...session,
    createdAt: new Date(session.timestamp),
    title: index === 0 ? 'Session A' : 'Session B',
  }))
})

const rpc = useRpc()
const sessions = await rpc.value.call('vite:rolldown:list-sessions')

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
    <p v-if="sessions.length" op50>
      {{ sessionMode === 'list' ? 'Select a build session to get started:' : 'Select 2 build sessions to compare:' }}
    </p>
    <p v-else op50>
      No sessions yet, run a build to get started.
    </p>
    <div relative flex="~ col gap3 items-center">
      <PanelSessionSelector
        :session-mode="sessionMode"
        :sessions="sessions"
        :selected-session-ids="selectedSessionIds"
        :selected-sessions="selectedSessions"
        @select="selectSession"
      />
    </div>
    <div v-if="sessions.length" fixed top-5 right-5 flex="~ col gap2">
      <div flex="~ row justify-around" w20 h8 border="~ base rounded-8" of-hidden>
        <button v-for="mode in modeList" :key="mode.value" :title="mode.label" flex-1 op50 flex="~ items-center justify-center" :class="{ 'bg-active text-base op100!': sessionMode === mode.value }" hover="bg-active text-base op100!" @click="sessionMode = mode.value">
          <span :class="mode.icon" class="text-sm" />
        </button>
      </div>
    </div>
    <div v-if="selectedSessions.length > 0 && sessionMode === 'compare'" fixed bottom-5 right-5 border="~ base rounded-2" w100 max-lg:w85 bg-glass z-panel-content>
      <CompareSessionMeta :sessions="normalizedSelectedSessions" class="flex-col gap0 [&>div]:border-none! [&>first-child]:border-b!" />
      <div flex="~ justify-center" p2>
        <NuxtLink v-if="selectedSessions.length === 2" tag="button" :to="`/compare/${selectedSessionIds.join(',')}`" btn-action rounded-8 text-3 flex="~ justify-center" w30 h8>
          Compare
        </NuxtLink>
        <div v-else op80 text-sm>
          Select one more session to compare.
        </div>
      </div>
    </div>
  </div>
</template>
