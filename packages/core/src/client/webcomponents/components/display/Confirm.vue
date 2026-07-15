<script setup lang="ts">
import { useTemplateRef, watchPostEffect } from 'vue'
import { ConfirmPromise } from '../../state/confirm'
import Button from './Button.vue'

const confirmButton = useTemplateRef<InstanceType<typeof Button>>('confirmButton')

watchPostEffect(() => {
  confirmButton.value?.focus({ preventScroll: true })
})

function resolveConfirm(resolve: (value: boolean) => void, value: boolean) {
  resolve(value)
}
</script>

<template>
  <ConfirmPromise v-slot="{ resolve, args: [options] }">
    <div
      class="vite-devtools-confirm fixed inset-0 z-2147483647 flex items-center justify-center p-4 color-base"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="options.title ? 'vite-devtools-confirm-title' : undefined"
      aria-describedby="vite-devtools-confirm-message"
      @keydown.esc.prevent.stop="resolveConfirm(resolve, false)"
    >
      <div
        class="absolute inset-0 bg-black/30 dark:bg-black/45 backdrop-blur-1 cursor-default"
        aria-hidden="true"
        @click="resolveConfirm(resolve, false)"
      />

      <div class="relative w-full max-w-96 bg-base border border-base rounded-lg shadow-xl p-5">
        <h3 v-if="options.title" id="vite-devtools-confirm-title" class="text-sm font-medium leading-5">
          {{ options.title }}
        </h3>
        <p
          id="vite-devtools-confirm-message"
          class="text-xs op60 leading-5"
          :class="options.title ? 'mt-1.5' : ''"
        >
          {{ options.message }}
        </p>

        <div class="flex items-center justify-end gap-2 mt-6">
          <Button variant="ghost" size="sm" @click="resolveConfirm(resolve, false)">
            {{ options.cancelText ?? 'Cancel' }}
          </Button>
          <Button ref="confirmButton" variant="soft" size="sm" @click="resolveConfirm(resolve, true)">
            {{ options.confirmText ?? 'OK' }}
          </Button>
        </div>
      </div>
    </div>
  </ConfirmPromise>
</template>
