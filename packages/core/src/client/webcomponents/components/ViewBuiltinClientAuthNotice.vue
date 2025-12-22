<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import VitePlus from './icons/VitePlus.vue'

defineProps<{
  context: DocksContext
}>()
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
    </div>
  </div>
</template>
