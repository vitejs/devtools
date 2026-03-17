<script setup lang="ts">
import { onMounted, ref } from 'vue'

const {
  src,
  alt = '',
} = defineProps<{
  src: string
  alt?: string
}>()

const success = ref(false)

onMounted(() => {
  const img = new Image()
  img.src = src
  img.onload = () => {
    success.value = true
  }
})
</script>

<template>
  <img
    v-if="success"
    :src="src"
    :alt="alt"
    @error="success = false"
  >
</template>
