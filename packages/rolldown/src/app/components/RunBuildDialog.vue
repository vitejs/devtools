<script setup lang="ts">
import type { BuildInfo } from '~~/node/rolldown/logs-manager'
import { DEVTOOLS_TERMINALS_DOCK_ID } from '@vitejs/devtools-kit/constants'
import DisplayTimestamp from '@vitejs/devtools-ui/components/Display/DisplayTimestamp.vue'
import OverlayModal from '@vitejs/devtools-ui/components/Overlay/OverlayModal.vue'
import { ref, watch } from 'vue'
import { NuxtLink } from '#components'
import { useRpc } from '#imports'

// Bubble the refreshed session list up so the parent's list stays in sync
// whether the build finished with the modal open or dismissed to the background.
const emit = defineEmits<{ refresh: [BuildInfo[]] }>()
const open = defineModel<boolean>('open', { default: false })
const rpc = useRpc()

type Stage = 'confirm' | 'running' | 'success' | 'error'
const stage = ref<Stage>('confirm')
const commandLine = ref('vite build')
const buildSessionId = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const newSessions = ref<BuildInfo[]>([])

// Reset to the confirmation step and load the exact command each time the
// dialog is opened afresh.
watch(open, async (isOpen) => {
  if (!isOpen)
    return
  stage.value = 'confirm'
  errorMessage.value = null
  newSessions.value = []
  buildSessionId.value = null
  try {
    const cmd = await rpc.value.call('vite:rolldown:get-build-command')
    const env = Object.entries(cmd.env ?? {}).map(([k, v]) => `${k}=${v}`).join(' ')
    commandLine.value = `${env ? `${env} ` : ''}${cmd.command} ${(cmd.args ?? []).join(' ')}`.trim()
  }
  catch {
    commandLine.value = 'vite build'
  }
})

async function confirmRun() {
  stage.value = 'running'
  errorMessage.value = null
  // Snapshot existing session ids to surface only the ones this build produces.
  const before = new Set((await rpc.value.call('vite:rolldown:list-sessions')).map(s => s.id))
  try {
    const { sessionId } = await rpc.value.call('vite:rolldown:run-build')
    buildSessionId.value = sessionId
    const { exitCode } = await rpc.value.call('vite:rolldown:wait-for-build')
    const list = await rpc.value.call('vite:rolldown:list-sessions')
    emit('refresh', list)
    newSessions.value = list.filter(s => !before.has(s.id))
    // If the user dismissed the modal while it ran, leave it closed — the list
    // was already refreshed above.
    if (!open.value)
      return
    if (exitCode != null && exitCode !== 0) {
      stage.value = 'error'
      errorMessage.value = `Build exited with code ${exitCode}.`
    }
    else {
      stage.value = 'success'
    }
  }
  catch (error) {
    if (!open.value)
      return
    stage.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
}

async function viewInTerminal() {
  if (buildSessionId.value) {
    await rpc.value.call('hub:docks:activate', {
      dockId: DEVTOOLS_TERMINALS_DOCK_ID,
      params: { sessionId: buildSessionId.value },
    })
  }
  open.value = false
}

function primaryInput(session: BuildInfo) {
  return session.meta.inputs?.[0]?.name || session.meta.inputs?.[0]?.filename || 'entry'
}
</script>

<template>
  <OverlayModal v-model:open="open">
    <template #title>
      Run build with devtools
    </template>

    <div class="flex flex-col gap-4 w-140 max-w-full">
      <!-- Confirm -->
      <template v-if="stage === 'confirm'">
        <p class="m0 op70 text-sm">
          This runs a production build with Rolldown's devtools output enabled, then adds the resulting session below.
        </p>
        <pre class="m0 p3 rounded-lg border border-base bg-code font-mono text-sm of-auto text-left"><code>{{ commandLine }}</code></pre>
        <div class="flex justify-end gap-2">
          <button class="border border-base rounded-8 text-3 px3 h8 hover:bg-active" @click="open = false">
            Cancel
          </button>
          <button class="btn-action rounded-8 text-3 flex gap2 items-center justify-center px3 h8" @click="confirmRun()">
            <span class="i-ph-play-duotone text-sm" />
            Run build
          </button>
        </div>
      </template>

      <!-- Running -->
      <template v-else-if="stage === 'running'">
        <div class="flex gap2 items-center op80">
          <span class="i-ph-circle-notch-duotone animate-spin text-base" />
          Build running…
        </div>
        <pre class="m0 p3 rounded-lg border border-base bg-code font-mono text-sm of-auto text-left"><code>{{ commandLine }}</code></pre>
        <div class="flex justify-end gap-2">
          <button class="border border-base rounded-8 text-3 px3 h8 hover:bg-active" @click="open = false">
            Dismiss
          </button>
          <button class="btn-action rounded-8 text-3 flex gap2 items-center justify-center px3 h8" @click="viewInTerminal()">
            <span class="i-ph-terminal-window-duotone text-sm" />
            View in terminals
          </button>
        </div>
      </template>

      <!-- Success -->
      <template v-else-if="stage === 'success'">
        <div class="flex gap2 items-center text-green">
          <span class="i-ph-check-circle-duotone text-base" />
          Build finished successfully.
        </div>
        <template v-if="newSessions.length">
          <p class="m0 op60 text-sm">
            New session{{ newSessions.length > 1 ? 's' : '' }} — open one to inspect it:
          </p>
          <div class="flex flex-col gap-2">
            <NuxtLink
              v-for="session of newSessions"
              :key="session.id"
              :to="`/session/${session.id}`"
              class="border border-base rounded-md color-base text-left flex flex-col gap-1 px3 py2 hover:bg-active"
              @click="open = false"
            >
              <div class="flex gap-1 items-center font-mono op50 text-sm">
                <div class="i-ph-hash-duotone" />
                {{ session.id }}
              </div>
              <div class="flex gap-2 items-center">
                <span class="font-mono text-sm">{{ primaryInput(session) }}</span>
                <DisplayTimestamp :timestamp="session.timestamp" class="text-xs op50" />
              </div>
            </NuxtLink>
          </div>
        </template>
        <p v-else class="m0 op60 text-sm">
          The build produced no new devtools session.
        </p>
        <div class="flex justify-end gap-2">
          <button class="border border-base rounded-8 text-3 px3 h8 hover:bg-active" @click="viewInTerminal()">
            View in terminals
          </button>
          <button class="btn-action rounded-8 text-3 px3 h8" @click="open = false">
            Close
          </button>
        </div>
      </template>

      <!-- Error -->
      <template v-else>
        <div class="flex gap2 items-center text-red">
          <span class="i-ph-x-circle-duotone text-base" />
          Build failed.
        </div>
        <p v-if="errorMessage" class="m0 op70 text-sm">
          {{ errorMessage }}
        </p>
        <div class="flex justify-end gap-2">
          <button class="border border-base rounded-8 text-3 px3 h8 hover:bg-active" @click="open = false">
            Close
          </button>
          <button class="btn-action rounded-8 text-3 flex gap2 items-center justify-center px3 h8" @click="viewInTerminal()">
            <span class="i-ph-terminal-window-duotone text-sm" />
            View in terminals
          </button>
        </div>
      </template>
    </div>
  </OverlayModal>
</template>
