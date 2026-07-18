<script setup lang="ts">
import { onKeyDown } from '@vueuse/core'
import { computed } from 'vue'
import { useRoute, useRouter } from '#app/composables/router'

const route = useRoute()
const router = useRouter()

const resultId = computed(() =>
  typeof route.query.result === 'string' ? route.query.result : undefined,
)

function closeResultPanel() {
  if (resultId.value) router.replace({ query: { ...route.query, result: undefined } })
}

onKeyDown('Escape', event => {
  if (!resultId.value || !event.isTrusted || event.repeat) return

  event.preventDefault()
  closeResultPanel()
})
</script>

<template>
  <NuxtPage />

  <div
    v-if="resultId"
    class="fixed inset-0 z-panel-content backdrop-blur-8 backdrop-brightness-95"
    @click.self="closeResultPanel"
  >
    <div
      :key="resultId"
      class="fixed right-0 bottom-0 top-20 left-20 z-panel-content bg-glass border-l border-t border-base rounded-tl-xl"
    >
      <LintResultDetailsLoader :result-id @close="closeResultPanel" />
    </div>
  </div>
</template>
