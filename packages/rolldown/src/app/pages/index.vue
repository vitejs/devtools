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
    label: 'Build Sessions',
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
// The live project cwd; used to hide redundant per-session cwd labels.
const currentCwd = ref('')
rpc.value.call('vite:rolldown:get-project-info')
  .then(info => (currentCwd.value = info.cwd))
  .catch(() => {})

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

function patchSession(id: string, patch: Partial<BuildInfo>) {
  sessions.value = sessions.value.map(s => (s.id === id ? { ...s, ...patch } : s))
  selectedSessions.value = selectedSessions.value.map(s => (s.id === id ? { ...s, ...patch } : s))
}

async function renameSession(session: BuildInfo, alias: string) {
  const previous = session.alias
  // Optimistic update; roll back if the RPC fails.
  patchSession(session.id, { alias: alias || undefined })
  try {
    const result = await rpc.value.call('vite:rolldown:rename-session', { session: session.id, alias })
    patchSession(session.id, { alias: result.alias || undefined })
  }
  catch (error) {
    patchSession(session.id, { alias: previous })
    console.error('[rolldown-devtools] Failed to rename session:', error)
  }
}

async function deleteSession(session: BuildInfo) {
  const snapshot = sessions.value
  // Optimistic removal; restore the list if the RPC fails.
  sessions.value = sessions.value.filter(s => s.id !== session.id)
  selectedSessions.value = selectedSessions.value.filter(s => s.id !== session.id)
  try {
    await rpc.value.call('vite:rolldown:delete-session', { session: session.id })
  }
  catch (error) {
    sessions.value = snapshot
    console.error('[rolldown-devtools] Failed to delete session:', error)
  }
}
</script>

<template>
  <div class="p4 flex flex-col gap-4 items-center relative">
    <BannerRolldownDevTools />

    <!-- Empty state -->
    <div v-if="!sessions.length" class="flex flex-col gap-3 items-center max-w-140">
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

    <!-- Sessions panel -->
    <div v-else class="w-full max-w-3xl flex flex-col gap-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <!-- Mode switch, expanded as text tabs -->
        <div role="tablist" aria-label="Session mode" class="inline-flex items-center gap-0.5 p0.5 border border-base rounded-lg bg-glass">
          <button
            v-for="mode in modeList"
            :key="mode.value"
            type="button"
            role="tab"
            :aria-selected="sessionMode === mode.value"
            class="flex items-center gap-1.5 px3 py1.5 rounded-md text-sm transition"
            :class="sessionMode === mode.value ? 'bg-active text-base op100' : 'op50 hover:op80 hover:bg-active'"
            @click="sessionMode = mode.value"
          >
            <span :class="mode.icon" />
            <span>{{ mode.label }}</span>
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

      <p class="m0 op50 text-sm">
        {{ sessionMode === 'list' ? 'Select a build session to get started:' : 'Select 2 build sessions to compare:' }}
      </p>

      <PanelSessionSelector
        :session-mode="sessionMode"
        :sessions="sessions"
        :show-session-actions="true"
        :selected-session-ids="selectedSessionIds"
        :selected-sessions="selectedSessions"
        :current-cwd="currentCwd"
        @select="selectSession"
        @rename="renameSession"
        @delete="deleteSession"
      />
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
