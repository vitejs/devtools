<script setup lang="ts">
import type { PackageInfo } from '~~/shared/types'

defineProps<{
  package: PackageInfo
}>()
</script>

<template>
  <NuxtLink
    :to="{ query: { package: package.name } }"
    w-full font-mono border="~ rounded base" px2 py1 text-sm hover="bg-active"
  >
    <div flex="~ gap-1">
      <DisplayFileIcon :filename="package.name" />
      <span overflow-hidden text-ellipsis break-all line-clamp-2>
        {{ package.name }}
        {{ package.version }}
      </span>
    </div>
  </NuxtLink>
</template>
