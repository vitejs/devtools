<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { ref, useTemplateRef, watch } from 'vue'
import Button from '../display/Button.vue'
import OtpInput from '../display/OtpInput.vue'
import VitePlus from '../icons/VitePlus.vue'

const props = defineProps<{
  context: DocksContext
}>()

const CODE_LENGTH = 6

const code = ref('')
const error = ref('')
const verifying = ref(false)
const otp = useTemplateRef<InstanceType<typeof OtpInput>>('otp')

// When a failed attempt clears the boxes we don't want that programmatic reset
// to also wipe the error message it just set — skip the next change once.
let skipErrorClear = false

// Clear the error as soon as the user edits the code again.
watch(code, () => {
  if (skipErrorClear) {
    skipErrorClear = false
    return
  }
  if (error.value)
    error.value = ''
})

async function submit() {
  const value = code.value
  if (value.length < CODE_LENGTH || verifying.value)
    return

  verifying.value = true
  error.value = ''
  try {
    const ok = await props.context.rpc.requestTrustWithCode(value)
    if (!ok) {
      error.value = 'That code didn\u2019t match. Check your terminal and try again.'
      skipErrorClear = true
      code.value = ''
      otp.value?.focus()
    }
    // On success the dock reacts to the trust event and swaps this view out.
  }
  catch {
    error.value = 'Something went wrong while authorizing. Please try again.'
  }
  finally {
    verifying.value = false
  }
}
</script>

<template>
  <div class="w-full h-full flex items-center justify-center p8 color-base overflow-auto">
    <div class="w-full max-w-108 flex flex-col items-center text-center">
      <!-- Brand -->
      <div class="relative flex items-center justify-center">
        <div class="absolute w-24 h-24 rounded-full bg-primary-500/20 blur-2xl" aria-hidden="true" />
        <VitePlus class="relative w-16 h-16" />
      </div>

      <h1 class="text-2xl font-bold tracking-tight">
        Authorize Vite DevTools
      </h1>
      <p class="mt2 text-sm op-fade leading-relaxed max-w-92">
        DevTools can access your server, read your filesystem, and run commands.
        Confirm it's you before continuing.
      </p>

      <!-- Card -->
      <div class="mt6 w-full rounded-lg border border-base bg-base/60 shadow-sm p6 flex flex-col items-center gap-4">
        <div class="flex flex-col items-center gap-1">
          <p class="text-sm op-fade">
            Find the
            <span class="font-mono text-primary-600 dark:text-primary-300">6-digit code</span>
            printed in your terminal.
          </p>
        </div>

        <form class="flex flex-col items-center gap-4 w-full" autocomplete="off" @submit.prevent="submit">
          <OtpInput
            ref="otp"
            v-model="code"
            :length="CODE_LENGTH"
            :invalid="!!error"
            :disabled="verifying"
            label="Enter your one-time authorization code"
            @complete="submit"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            :loading="verifying"
            :disabled="code.length < CODE_LENGTH"
          >
            <template #icon>
              <div class="i-ph-shield-check-duotone w-4.5 h-4.5" />
            </template>
            {{ verifying ? 'Authorizing' : 'Authorize' }}
          </Button>

          <p
            v-if="error || verifying"
            class="text-sm min-h-5 transition-colors"
            :class="error ? 'text-red-500' : 'op-mute'"
            role="alert"
            aria-live="assertive"
          >
            <template v-if="error">
              {{ error }}
            </template>
            <template v-else-if="verifying">
              Authorizing...
            </template>
          </p>
        </form>
      </div>

      <p class="mt4 text-xs op-mute max-w-92 leading-relaxed">
        You can also use the magic link to authorize automatically.
      </p>
    </div>
  </div>
</template>
