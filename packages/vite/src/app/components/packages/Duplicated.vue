<script setup lang="ts">
import type { PackageInfo, SessionContext } from '~~/shared/types'
import { computed } from 'vue'

const props = defineProps<{
  packages: PackageInfo[]
  session: SessionContext
}>()

const duplicatePackages = computed(() => props.packages.filter(p => p.duplicated))

const groupedDuplicatePackages = computed(() =>
  duplicatePackages.value.reduce((acc, p) => {
    acc[p.name] = [...(acc[p.name] || []), p]
    return acc
  }, {} as Record<string, PackageInfo[]>))
</script>

<template>
  <template v-if="duplicatePackages.length">
    <div v-for="(p, i) of groupedDuplicatePackages" :key="i">
      <PackagesTable :packages="p" :session="session" group-view disable-size-sort />
    </div>
  </template>
  <template v-else>
    <div p4>
      <div w-full h-48 flex="~ items-center justify-center" op50 italic>
        No duplicate packages
      </div>
    </div>
  </template>
</template>
