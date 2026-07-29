<script setup lang="ts">
import type { BuildInfo } from '~~/node/rolldown/logs-manager'
import { DEVTOOLS_TERMINALS_DOCK_ID } from '@vitejs/devtools-kit/constants'
import ActionButton from '@vitejs/devtools-ui/components/Action/ActionButton.vue'
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import DisplayTimestamp from '@vitejs/devtools-ui/components/Display/DisplayTimestamp.vue'
import OverlayModal from '@vitejs/devtools-ui/components/Overlay/OverlayModal.vue'
import VisualEmptyState from '@vitejs/devtools-ui/components/Visual/VisualEmptyState.vue'
import VisualLoading from '@vitejs/devtools-ui/components/Visual/VisualLoading.vue'
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
</script>

<template>
  <OverlayModal v-model:open="open">
    <template #title>
      Run build with devtools
    </template>

    <!-- Fixed min-height keeps the panel from jumping as stages swap. -->
    <div class="flex flex-col gap-4 w-140 max-w-full min-h-64">
      <!-- Confirm -->
      <template v-if="stage === 'confirm'">
        <p class="m0 op70 text-sm">
          This runs a production build with Rolldown's devtools output enabled, then adds the resulting session below.
        </p>
        <pre class="m0 p3 rounded-lg border border-base bg-code font-mono text-sm of-auto text-left"><code>{{ commandLine }}</code></pre>
        <div class="flex-auto" />
        <div class="flex justify-end gap-2">
          <ActionButton @click="open = false">
            Cancel
          </ActionButton>
          <ActionButton variant="primary" icon="i-ph-play-duotone" @click="confirmRun()">
            Run build
          </ActionButton>
        </div>
      </template>

      <!-- Running -->
      <template v-else-if="stage === 'running'">
        <VisualLoading class="flex-auto" text="Build running…" />
        <div class="flex justify-end gap-2">
          <ActionButton @click="open = false">
            Dismiss
          </ActionButton>
          <ActionButton variant="primary" icon="i-ph-terminal-window-duotone" @click="viewInTerminal()">
            View in terminals
          </ActionButton>
        </div>
      </template>

      <!-- Success -->
      <template v-else-if="stage === 'success'">
        <div class="flex gap-2 items-center text-green">
          <span class="i-ph-check-circle-duotone" />
          Build finished successfully.
        </div>
        <template v-if="newSessions.length">
          <p class="m0 op60 text-sm">
            New session{{ newSessions.length > 1 ? 's' : '' }} — open one to inspect it:
          </p>
          <div class="flex flex-col gap-2 flex-auto of-auto">
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
              <div v-if="session.meta.inputs?.[0]" class="flex gap-1 items-center">
                <DisplayModuleId :id="session.meta.inputs[0].filename" :cwd="session.meta.cwd" />
                <DisplayBadge :text="session.meta.inputs[0].name || 'entry'" />
              </div>
              <DisplayTimestamp :timestamp="session.timestamp" class="text-xs op50" />
            </NuxtLink>
          </div>
        </template>
        <VisualEmptyState
          v-else
          class="flex-auto"
          icon="i-ph-package-duotone"
          description="The build produced no new devtools session."
        />
        <div class="flex justify-end gap-2">
          <ActionButton @click="viewInTerminal()">
            View in terminals
          </ActionButton>
          <ActionButton variant="primary" @click="open = false">
            Close
          </ActionButton>
        </div>
      </template>

      <!-- Error -->
      <template v-else>
        <div class="flex gap-2 items-center text-red">
          <span class="i-ph-x-circle-duotone" />
          Build failed.
        </div>
        <p v-if="errorMessage" class="m0 op70 text-sm">
          {{ errorMessage }}
        </p>
        <div class="flex-auto" />
        <div class="flex justify-end gap-2">
          <ActionButton @click="open = false">
            Close
          </ActionButton>
          <ActionButton variant="primary" icon="i-ph-terminal-window-duotone" @click="viewInTerminal()">
            View in terminals
          </ActionButton>
        </div>
      </template>
    </div>
  </OverlayModal>
</template>
