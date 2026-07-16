<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

// Teleported overlay dialog with a solid `bg-base` panel over a dimmed
// backdrop. The `open` state
// is a two-way model so hosts can drive it however they like; the optional
// `#trigger` slot receives an `open()` callback for the common
// click-to-open case. Backdrop click and the Escape key both close it.
const open = defineModel<boolean>('open', { default: false })

function close() {
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape')
    close()
}

watch(open, (value) => {
  if (typeof document === 'undefined')
    return
  if (value)
    document.addEventListener('keydown', onKeydown)
  else
    document.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined')
    document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <slot name="trigger" :open="() => (open = true)" />
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="op0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="op0"
    >
      <div
        v-if="open"
        fixed inset-0 z-100 flex items-center justify-center p4
        @click.self="close"
      >
        <div absolute inset-0 bg-black:50 @click="close" />
        <div
          relative max-h="85vh" of-auto bg-base border="~ base rounded-lg" shadow-xl
          flex="~ col"
        >
          <div v-if="$slots.title" flex="~ items-center justify-between gap-4" px4 py3 border="b base">
            <div font-medium>
              <slot name="title" />
            </div>
            <button
              type="button"
              w-7 h-7 rounded-full flex items-center justify-center op50 hover="bg-active op100"
              aria-label="Close"
              @click="close"
            >
              <div i-ph-x />
            </button>
          </div>
          <div p4 of-auto>
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
