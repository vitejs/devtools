<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { ref } from 'vue'
import VitePlus from '../icons/VitePlus.vue'

defineProps<{
  context: DocksContext
}>()

const passwordInput = ref('')

function submitPassword() {
  const value = passwordInput.value.trim()
  if (!value)
    return
  localStorage.setItem('__VITE_DEVTOOLS_CONNECTION_AUTH_ID__', value)
  window.location.reload()
}
</script>

<template>
  <div class="w-full h-full flex flex-col items-center justify-center p20">
    <div class="max-w-150 flex flex-col items-center justify-center gap-2">
      <VitePlus class="w-20 h-20" />
      <h1 class="text-2xl font-bold text-violet mb2">
        Vite DevTools is Unauthorized
      </h1>
      <p class="op75">
        Vite DevTools offers advanced features that can access your server, view your filesystem, and execute commands.
      </p>
      <p class="op75">
        To protect your project from unauthorized access, please authorize your browser before proceeding.
      </p>
      <p class="font-bold bg-green:5 p1 px3 rounded mt8 text-green">
        Check your terminal for the authorization prompt and come back.
      </p>
      <div class="mt6 op50">
        or
      </div>
      <form class="mt2 flex items-center gap-2" @submit.prevent="submitPassword">
        <input
          v-model="passwordInput"
          type="text"
          placeholder="Enter auth password"
          class="px3 py1.5 rounded border border-base bg-transparent text-sm outline-none focus:border-violet"
        >
        <button
          type="submit"
          class="px3 py1.5 rounded bg-violet text-white text-sm hover:op80 disabled:op40"
          :disabled="!passwordInput.trim()"
        >
          Authorize
        </button>
      </form>
    </div>
  </div>
</template>
