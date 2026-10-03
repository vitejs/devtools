<script setup lang="ts">
import ActionButton from '@vitejs/devtools-ui/components/Action/ActionButton.vue'
import FormCheckbox from '@vitejs/devtools-ui/components/Form/FormCheckbox.vue'
import OverlayModal from '@vitejs/devtools-ui/components/Overlay/OverlayModal.vue'
import VisualLoading from '@vitejs/devtools-ui/components/Visual/VisualLoading.vue'
import { ref, watch } from 'vue'
import { useRpc } from '#imports'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ complete: [write: boolean] }>()
const rpc = useRpc()

type Stage = 'confirm' | 'running' | 'success' | 'error'
const stage = ref<Stage>('confirm')
const write = ref(false)
const commandLine = ref('')
const gitDirty = ref(false)
const errorMessage = ref('')
let previewRequest = 0

async function loadPreview() {
  const request = ++previewRequest
  try {
    const preview = await rpc.value.call('devtools-oxc:oxfmt-format-preview', {
      write: write.value,
    })
    if (request !== previewRequest) return
    commandLine.value = preview.command
    gitDirty.value = preview.gitDirty
  } catch (error) {
    if (request !== previewRequest) return
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
}

watch(open, isOpen => {
  if (!isOpen) return
  stage.value = 'confirm'
  write.value = false
  commandLine.value = ''
  gitDirty.value = false
  errorMessage.value = ''
  loadPreview()
})

watch(write, () => {
  if (open.value && stage.value === 'confirm') loadPreview()
})

async function confirmRun() {
  stage.value = 'running'
  errorMessage.value = ''
  try {
    const { exitCode } = await rpc.value.call('devtools-oxc:run-format', { write: write.value })
    emit('complete', write.value)
    if (!open.value) return
    if (!write.value) {
      open.value = false
      return
    }
    stage.value = exitCode === 0 ? 'success' : 'error'
    if (exitCode !== 0) errorMessage.value = `Oxfmt exited with code ${exitCode}.`
  } catch (error) {
    if (!open.value) return
    stage.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
}
</script>

<template>
  <OverlayModal v-model:open="open">
    <template #title> Run Oxfmt with devtools </template>

    <div class="flex flex-col gap-4 w-140 max-w-full min-h-64">
      <template v-if="stage === 'confirm'">
        <p class="m0 op70 text-sm">
          {{
            write
              ? 'Format and write files in place.'
              : 'Check if files are formatted, and show statistics.'
          }}
        </p>
        <pre
          class="m0 p3 rounded-lg border border-base bg-code font-mono text-sm of-auto text-left"
        ><code>{{ commandLine || 'Loading…' }}</code></pre>
        <p v-if="gitDirty" class="m0 text-amber text-sm flex gap-2 items-start">
          <span class="i-ph-warning-duotone mt-0.5 shrink-0" />
          <span>The Git working tree is not clean. Formatting may modify project files.</span>
        </p>
        <p v-if="errorMessage" class="m0 text-red text-sm">{{ errorMessage }}</p>
        <div class="flex-auto" />
        <div class="flex items-center justify-between gap-2">
          <FormCheckbox v-model="write" label="Write changes" />
          <div class="flex gap-2">
            <ActionButton @click="open = false"> Cancel </ActionButton>
            <ActionButton variant="primary" icon="i-ph-play-duotone" @click="confirmRun">
              Run Format
            </ActionButton>
          </div>
        </div>
      </template>

      <template v-else-if="stage === 'running'">
        <VisualLoading class="flex-auto" text="Formatting…" />
        <div class="flex justify-end">
          <ActionButton @click="open = false"> Dismiss </ActionButton>
        </div>
      </template>

      <template v-else>
        <div
          :class="stage === 'success' ? 'text-green' : 'text-red'"
          class="flex gap-2 items-center"
        >
          <span
            :class="stage === 'success' ? 'i-ph-check-circle-duotone' : 'i-ph-x-circle-duotone'"
          />
          {{ stage === 'success' ? 'Formatting finished successfully.' : 'Formatting failed.' }}
        </div>
        <p v-if="errorMessage" class="m0 op70 text-sm">{{ errorMessage }}</p>
        <div class="flex-auto" />
        <div class="flex justify-end">
          <ActionButton variant="primary" @click="open = false"> Close </ActionButton>
        </div>
      </template>
    </div>
  </OverlayModal>
</template>
