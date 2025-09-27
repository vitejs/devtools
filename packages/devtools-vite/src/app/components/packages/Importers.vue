<script setup lang="ts">
import type { PackageInfo, SessionContext } from '~~/shared/types/data'
import { DisplayNumberBadge } from '#components'
import { computed } from 'vue'

const props = defineProps<{
  package: PackageInfo
  session: SessionContext
}>()

const importers = computed(() => [...new Set(props.package.files.filter(f => !!f.importers).flatMap(f => f.importers))])
</script>

<template>
  <div v-if="importers.length === 1">
    <DisplayModuleId :id="importers[0]!" :session="session" link />
  </div>
  <VMenu v-else :delay="{ show: 200, hide: 0 }">
    <DisplayNumberBadge :number="importers.length" class="text-blue dark:text-blue" />
    <template #popper>
      <div p2 flex="~ col gap-1">
        <div v-for="importer of importers" :key="importer" flex="~ row gap-1 items-center nowrap" w-max>
          <DisplayModuleId :id="importer" :session="session" ws-nowrap flex-1 disable-tooltip link />
        </div>
      </div>
    </template>
  </VMenu>
</template>
