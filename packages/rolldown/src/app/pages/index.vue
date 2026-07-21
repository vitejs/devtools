<script setup lang="ts">
import type { BuildInfo } from '~~/node/rolldown/logs-manager'
import { DEVTOOLS_TERMINALS_DOCK_ID } from '@vitejs/devtools-kit/constants'
import BannerRolldownDevTools from '@vitejs/devtools-ui/components/Banner/BannerRolldownDevTools.vue'
import DisplayIconButton from '@vitejs/devtools-ui/components/Display/DisplayIconButton.vue'
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

const building = ref(false)
const buildError = ref<string | null>(null)
const buildSessionId = ref<string | null>(null)

async function refreshSessions() {
  sessions.value = await rpc.value.call('vite:rolldown:list-sessions')
}

async function navigateToBuildTerminal() {
  if (!buildSessionId.value)
    return
  // Jump to the Terminals dock, focused on this build's session, via the hub's
  // dock-activation RPC.
  await rpc.value.call('hub:docks:activate', {
    dockId: DEVTOOLS_TERMINALS_DOCK_ID,
    params: { sessionId: buildSessionId.value },
  })
}

async function runBuild() {
  // While a build is running, clicking opens its Terminals session to watch it
  // stream, rather than starting another build.
  if (building.value) {
    await navigateToBuildTerminal()
    return
  }
  building.value = true
  buildError.value = null
  try {
    const { sessionId } = await rpc.value.call('vite:rolldown:run-build')
    buildSessionId.value = sessionId
    const { exitCode } = await rpc.value.call('vite:rolldown:wait-for-build')
    if (exitCode != null && exitCode !== 0)
      buildError.value = `Build exited with code ${exitCode}.`
    // Refresh regardless — a failed build may still have emitted partial data.
    await refreshSessions()
  }
  catch (error) {
    buildError.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    building.value = false
  }
}

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
      <button
        class="btn-action rounded-8 text-3 flex gap2 items-center justify-center h9 px4"
        :title="building ? 'View this build in the Terminals tab' : 'Run a build with devtools output'"
        @click="runBuild()"
      >
        <span class="text-sm" :class="building ? 'i-ph-circle-notch-duotone animate-spin' : 'i-ph-play-duotone'" />
        {{ building ? 'Building… (view terminal)' : 'Run build with devtools' }}
      </button>
      <p v-if="buildError" class="m0 text-sm text-center text-red">
        {{ buildError }}
      </p>
      <p class="m0 op40 text-sm text-center">
        Or enable it manually in your Rolldown config:
      </p>
      <div class="relative w-full">
        <pre class="m0 p3 pr10 rounded-lg border border-base bg-code font-mono text-sm of-auto text-left"><code>{{ ENABLE_DEVTOOLS_SNIPPET }}</code></pre>
        <DisplayIconButton
          class="absolute" top2 right2
          title="Copy snippet"
          class-icon="i-ph-copy-duotone"
          :active="copied"
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
      <button
        class="btn-action rounded-8 text-3 flex gap2 items-center justify-center h8 px3"
        :title="building ? 'View this build in the Terminals tab' : 'Run a build with devtools output'"
        @click="runBuild()"
      >
        <span class="text-sm" :class="building ? 'i-ph-circle-notch-duotone animate-spin' : 'i-ph-play-duotone'" />
        {{ building ? 'Building…' : 'Run build' }}
      </button>
      <p v-if="buildError" class="m0 text-xs text-right text-red max-w-60">
        {{ buildError }}
      </p>
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
  </div>
</template>
