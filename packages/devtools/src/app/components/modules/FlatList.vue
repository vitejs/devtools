<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'
import { ref } from 'vue'
import ModuleDetailsLoader from '~/components/data/ModuleDetailsLoader.vue'

defineProps<{
  session: SessionContext
  modules: ModuleListItem[]
}>()

const expandedId = ref<string | null>(null)

function toggleExpandModule(id: string) {
  if (expandedId.value === id)
    expandedId.value = null
  else
    expandedId.value = id
}
</script>

<template>
  <div flex="~ col gap-2" p4>
    <template v-for="mod of modules" :key="mod.id">
      <div
        border="~ base rounded"
        block
        :class="expandedId === mod.id ? 'bg-active' : ''"
      >
        <DisplayModuleId
          :id="mod.id"
          :session
          px2 p1 block
          cursor-pointer
          @click="toggleExpandModule(mod.id)"
        />
        <div v-if="expandedId === mod.id" border="t base" p2>
          <ModuleDetailsLoader
            :session="session"
            :module="mod.id"
            @close="expandedId = null"
          />
        </div>
      </div>
    </template>
  </div>
</template>
