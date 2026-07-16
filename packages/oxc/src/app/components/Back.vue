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
  <button btn-action-sm mb2 w-fit cursor-pointer @click="goBack">
    <div i-ph-arrow-bend-up-left-duotone />
    Back
  </button>
</template>
