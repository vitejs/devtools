<script setup lang="ts">
import type { BuildInfo } from '~~/node/rolldown/logs-manager'
import ActionButton from '@vitejs/devtools-ui/components/Action/ActionButton.vue'
import ActionIconButton from '@vitejs/devtools-ui/components/Action/ActionIconButton.vue'
import BannerRolldownDevTools from '@vitejs/devtools-ui/components/Banner/BannerRolldownDevTools.vue'
import { useClipboard } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useRpc } from '#imports'

const ENABLE_DEVTOOLS_SNIPPET = `export default defineConfig({
  build: {
    rolldownOptions: {
      devtools: {}
    }
  }
})`

const { copy, copied } = useClipboard({ source: ENABLE_DEVTOOLS_SNIPPET })

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
  const sortedSessions = selectedSessions.value.toSorted((a, b) => a.timestamp - b.timestamp)
  return sortedSessions.map((session, index) => ({
    ...session,
    createdAt: new Date(session.timestamp),
    title: index === 0 ? 'Session A' : 'Session B',
  }))
})

const rpc = useRpc()
const sessions = ref<BuildInfo[]>(await rpc.value.call('vite:rolldown:list-sessions'))

// Drives the confirm → run → result modal (see RunBuildDialog).
const runBuildOpen = ref(false)

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
  <div class="p4 flex flex-col gap-4 items-center justify-center relative">
    <BannerRolldownDevTools />
    <p v-if="sessions.length" class="op50">
      {{ sessionMode === 'list' ? 'Select a build session to get started:' : 'Select 2 build sessions to compare:' }}
    </p>
    <div v-else class="flex flex-col gap-3 items-center max-w-140">
      <p class="m0 op50 text-center">
        No sessions yet.
        <br>
        Run a build with devtools output enabled to get started:
      </p>
      <ActionButton
        variant="primary"
        icon="i-ph-play-duotone"
        title="Run a build with devtools output"
        @click="runBuildOpen = true"
      >
        Run build with devtools
      </ActionButton>
      <p class="m0 op40 text-sm text-center">
        Or enable it manually in your Rolldown config:
      </p>
      <div class="relative w-full">
        <pre class="m0 p3 pr10 rounded-lg border border-base bg-code font-mono text-sm of-auto text-left"><code>{{ ENABLE_DEVTOOLS_SNIPPET }}</code></pre>
        <ActionIconButton
          class="absolute top2 right2"
          icon="i-ph-copy-duotone"
          :tooltip="copied ? 'Copied!' : 'Copy snippet'"
          :active="copied"
          active-class="text-green bg-active op100"
          @click="copy()"
        />
      </div>
      <p class="m0 op40 text-sm text-center">
        See <a href="https://github.com/vitejs/devtools/blob/main/docs/errors/RDDT0001.md" target="_blank" rel="noopener" class="hover:op100 hover:underline">RDDT0001</a> for details.
      </p>
    </div>
    <div class="relative flex flex-col gap3 items-center">
      <PanelSessionSelector
        :session-mode="sessionMode"
        :sessions="sessions"
        :selected-session-ids="selectedSessionIds"
        :selected-sessions="selectedSessions"
        @select="selectSession"
      />
    </div>
    <div v-if="sessions.length" class="fixed top-5 right-5 flex flex-col gap2 items-end">
      <div class="flex flex-row justify-around w20 h8 border border-base rounded-8 of-hidden">
        <button v-for="mode in modeList" :key="mode.value" :title="mode.label" class="flex-1 op50 flex items-center justify-center hover:bg-active hover:text-base hover:op100!" :class="{ 'bg-active text-base op100!': sessionMode === mode.value }" @click="sessionMode = mode.value">
          <span :class="mode.icon" class="text-sm" />
        </button>
      </div>
      <ActionButton
        icon="i-ph-play-duotone"
        title="Run a build with devtools output"
        @click="runBuildOpen = true"
      >
        Run build
      </ActionButton>
    </div>
    <div v-if="selectedSessions.length > 0 && sessionMode === 'compare'" class="fixed bottom-5 right-5 border border-base rounded-2 w100 max-lg:w85 bg-glass z-panel-content">
      <CompareSessionMeta :sessions="normalizedSelectedSessions" class="flex-col gap0 [&>div]:border-none! [&>first-child]:border-b!" />
      <div class="flex justify-center p2">
        <NuxtLink v-if="selectedSessions.length === 2" tag="button" :to="`/compare/${selectedSessionIds.join(',')}`" class="btn-action rounded-8 text-3 flex justify-center w30 h8">
          Compare
        </NuxtLink>
        <div v-else class="op80 text-sm">
          Select one more session to compare.
        </div>
      </div>
    </div>
    <RunBuildDialog v-model:open="runBuildOpen" @refresh="sessions = $event" />
  </div>
</template>
