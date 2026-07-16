<script setup lang="ts">
const { to = '' } = defineProps<{
  to?: string
}>()

function goBack() {
  if (to) {
    navigateTo(to, { replace: true })
  } else {
    window.focus()
    useRouter().back()
  }
}
</script>

<template>
  <u-button
    icon="ph:arrow-bend-up-left-duotone"
    color="neutral"
    variant="outline"
    class="cursor-pointer mb-2 w-fit"
    @click="goBack"
  >
    Back
  </u-button>
</template>
