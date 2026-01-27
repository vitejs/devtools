<script setup lang="ts">
import type { PackageInfo, SessionContext } from '~~/shared/types/data'
import DisplayBadge from '@vitejs/devtools-ui/components/DisplayBadge.vue'
import { computed } from 'vue'

const props = defineProps<{
  package: PackageInfo
  session: SessionContext
  showVersion: boolean
}>()

const importers = computed(() => {
  const pathMap = new Map()
  props.package.files.filter(f => !!f.importers).flatMap(f => f.importers).filter(i => !i.path.startsWith(props.package?.dir ?? '')).forEach((importer) => {
    pathMap.set(importer.path, importer)
  })
  return Array.from(pathMap.values())
})
</script>

<template>
  <div flex="~ row gap-1" of-hidden>
    <div flex="~ row gap-1" ws-nowrap>
      <DisplayModuleId :id="importers[0]!.path" :session="session" link />
      <DisplayBadge v-if="importers[0]!.version && showVersion" :text="importers[0]!.version" as="span" />
    </div>
    <VMenu v-if="importers.length > 1" :delay="{ show: 200, hide: 0 }" flex-none>
      <DisplayBadge :text="`+${importers.length}`" :color="100" class="text-xs rounded px1" />
      <template #popper>
        <div p2 flex="~ col gap-1">
          <div v-for="importer of importers" :key="importer.path" flex="~ row gap-1 items-center nowrap" w-max>
            <DisplayModuleId :id="importer.path" :session="session" ws-nowrap flex-1 disable-tooltip link />
            <DisplayBadge v-if="importer.version && showVersion" :text="`v${importer.version}`" as="span" />
          </div>
        </div>
      </template>
    </VMenu>
  </div>
</template>
