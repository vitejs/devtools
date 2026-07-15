<script setup lang="ts">
import DisplayBadge from '@vitejs/devtools-ui/components/DisplayBadge.vue'
import HelloWorld from '../components/HelloWorld.vue'
</script>

<template>
  <HelloWorld msg="Vite DevTools Playground" />
  <DisplayBadge text="<DisplayBadge />" />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
