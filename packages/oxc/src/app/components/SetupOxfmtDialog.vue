<script setup lang="ts">
import { DEVTOOLS_TERMINALS_DOCK_ID } from '@vitejs/devtools-kit/constants'
import ActionButton from '@vitejs/devtools-ui/components/Action/ActionButton.vue'
import FormCheckbox from '@vitejs/devtools-ui/components/Form/FormCheckbox.vue'
import OverlayModal from '@vitejs/devtools-ui/components/Overlay/OverlayModal.vue'
import VisualLoading from '@vitejs/devtools-ui/components/Visual/VisualLoading.vue'
import { ref, watch } from 'vue'
import { useRpc } from '#imports'

const emit = defineEmits<{ refresh: [] }>()
const open = defineModel<boolean>('open', { default: false })
const rpc = useRpc()

type Stage = 'confirm' | 'running' | 'error'
type Migration = 'prettier' | 'biome'

const stage = ref<Stage>('confirm')
const canMigrate = ref(false)
const migrate = ref(true)
const migration = ref<Migration>()
const gitDirty = ref(false)
const commandLine = ref('')
const sessionId = ref<string>()
const errorMessage = ref<string>()
const isLoading = ref(false)
let previewRequest = 0

async function loadPreview() {
  const request = ++previewRequest
  isLoading.value = true
  try {
    const preview = await rpc.value.call('devtools-oxc:oxfmt-setup-preview', {
      migrate: migrate.value,
    })
    if (request !== previewRequest) return
    canMigrate.value = preview.canMigrate
    migration.value = preview.migration
    if (!preview.canMigrate) migrate.value = false
    commandLine.value = preview.command
    gitDirty.value = preview.gitDirty
  } catch (error) {
    if (request !== previewRequest) return
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    if (request === previewRequest) isLoading.value = false
  }
}

watch(open, async isOpen => {
  if (!isOpen) return
  stage.value = 'confirm'
  canMigrate.value = false
  migrate.value = true
  migration.value = undefined
  gitDirty.value = false
  commandLine.value = ''
  sessionId.value = undefined
  errorMessage.value = undefined
  await loadPreview()
})

watch(migrate, () => {
  if (open.value && stage.value === 'confirm') loadPreview()
})

async function confirmSetup() {
  stage.value = 'running'
  errorMessage.value = undefined
  try {
    const result = await rpc.value.call('devtools-oxc:setup-oxfmt', {
      migrate: migrate.value,
    })
    sessionId.value = result.sessionId
    await rpc.value.call('devtools-oxc:wait-for-setup')
    if (!open.value) return
    emit('refresh')
    open.value = false
  } catch (error) {
    if (!open.value) return
    stage.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
}

async function viewInTerminal() {
  if (sessionId.value) {
    await rpc.value.call('hub:docks:activate', {
      dockId: DEVTOOLS_TERMINALS_DOCK_ID,
      params: { sessionId: sessionId.value },
    })
  }
}
</script>

<template>
  <OverlayModal v-model:open="open">
    <template #title> Setup Oxfmt with devtools</template>

    <div class="flex flex-col gap-4 w-140 max-w-full min-h-64">
      <template v-if="stage === 'confirm'">
        <p class="m0 op70 text-sm">
          <template v-if="canMigrate && migrate">
            Oxfmt will be installed as a development dependency and migrate your
            {{ migration === 'prettier' ? 'Prettier' : 'Biome' }} configuration.
          </template>
          <template v-else>
            Oxfmt will be installed as a development dependency and create a starter configuration
            with <code>oxfmt --init</code>.
          </template>
        </p>

        <div>
          <pre
            class="m0 p3 rounded-lg border border-base bg-code font-mono text-sm of-auto text-left"
          ><code>{{ commandLine || 'Loading…' }}</code></pre>
        </div>

        <p v-if="gitDirty" class="m0 text-amber text-sm flex gap-2 items-start">
          <span class="i-ph-warning-duotone mt-0.5 shrink-0" />
          <span>The Git working tree is not clean. Setup may modify project files.</span>
        </p>

        <p v-if="errorMessage" class="m0 text-red text-sm">
          {{ errorMessage }}
        </p>

        <div class="flex-auto" />
        <div v-if="!isLoading" class="flex items-center justify-between gap-2">
          <FormCheckbox v-if="canMigrate" v-model="migrate">
            <span class="text-sm"
              >Migrate from {{ migration === 'prettier' ? 'Prettier' : 'Biome' }}</span
            >
          </FormCheckbox>
          <div class="flex gap-2">
            <ActionButton @click="open = false"> Cancel </ActionButton>
            <ActionButton
              variant="primary"
              icon="i-ph-rocket-launch-duotone"
              @click="confirmSetup()"
            >
              Setup Oxfmt
            </ActionButton>
          </div>
        </div>
      </template>

      <template v-else-if="stage === 'running'">
        <VisualLoading class="flex-auto" text="Setting up Oxfmt…" />
        <div class="flex justify-end gap-2">
          <ActionButton @click="open = false"> Dismiss </ActionButton>
          <ActionButton
            v-if="sessionId"
            variant="primary"
            icon="i-ph-terminal-window-duotone"
            @click="viewInTerminal()"
          >
            View in terminals
          </ActionButton>
        </div>
      </template>

      <template v-else>
        <div class="flex gap-2 items-center text-red">
          <span class="i-ph-x-circle-duotone" />
          Oxfmt setup failed.
        </div>
        <p v-if="errorMessage" class="m0 op70 text-sm">
          {{ errorMessage }}
        </p>
        <div class="flex-auto" />
        <div class="flex justify-end gap-2">
          <ActionButton @click="open = false"> Close </ActionButton>
          <ActionButton
            v-if="sessionId"
            variant="primary"
            icon="i-ph-terminal-window-duotone"
            @click="viewInTerminal()"
          >
            View in terminals
          </ActionButton>
        </div>
      </template>
    </div>
  </OverlayModal>
</template>
