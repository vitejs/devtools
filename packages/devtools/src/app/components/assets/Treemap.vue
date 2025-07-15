<script setup lang="ts">
import type { Asset } from '@rolldown/debug'
import type { SessionContext } from '~~/shared/types'

defineProps<{
  assets: Asset[]
  session: SessionContext
}>()
</script>

<template>
  <div>
    {{ assets.length }}
  </div>
</template>
