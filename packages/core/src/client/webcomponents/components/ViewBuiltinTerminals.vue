<script setup lang="ts">
import type { DocksContext } from '@vitejs/devtools-kit/client'
import { useTerminals } from '../state/terminals'

const props = defineProps<{
  context: DocksContext
}>()

const terminals = useTerminals(props.context)
</script>

<template>
  <div>
    {{ terminals }}
  </div>
</template>
