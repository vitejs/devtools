<script setup lang="ts">
import { useRoute } from '#app/composables/router'

const params = useRoute().params as {
  session1: string
  session2: string
}
</script>

<template>
  <div>
    {{ params.session1 }}
    {{ params.session2 }}
  </div>
</template>

<style scoped>

</style>
