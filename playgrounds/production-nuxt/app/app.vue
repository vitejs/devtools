<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <main>
    <h1>Vite DevTools — Production Nuxt Playground</h1>
    <p>
      This app installs Nuxt with Nuxt DevTools from npm, inside a standalone
      pnpm workspace, with Nuxt DevTools' internal <code>@vitejs/devtools</code>
      and <code>@vitejs/devtools-kit</code> dependencies overridden to the
      local built dist — testing Vite DevTools the way it actually ships,
      running as Nuxt DevTools' own engine.
    </p>
    <button type="button" @click="count++">
      count is {{ count }}
    </button>
  </main>
</template>

<style scoped>
main {
  max-width: 42rem;
  margin: 4rem auto;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
  line-height: 1.6;
}
button {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid currentColor;
  cursor: pointer;
}
</style>
