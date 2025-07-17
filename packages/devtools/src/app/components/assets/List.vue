<script setup lang="ts">
import type { Asset as AssetInfo } from '@rolldown/debug'

defineProps<{
  assets: AssetInfo[]
}>()
</script>

<template>
  <div p4>
    <div flex="~ col gap-1">
      <template v-for="asset in assets" :key="asset.id">
        <NuxtLink
          :to="{ query: { asset: asset.filename } }"
          font-mono border="~ rounded base" px2 py1 text-sm hover="bg-active"
        >
          <div flex="~ gap-1">
            <DisplayFileIcon :filename="asset.filename" />
            {{ asset.filename }}
          </div>
        </NuxtLink>
      </template>
    </div>
  </div>
</template>
