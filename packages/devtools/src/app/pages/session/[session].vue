<script setup lang="ts">
import type { ModuleListItem, SessionContext } from '~~/shared/types'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { getFileTypeFromName } from '~/utils/icon'

const params = useRoute().params as {
  session: string
}

const isLoading = ref(true)
const session = reactive({
  id: computed(() => params.session),
  rootDir: '',
  modulesList: shallowRef<ModuleListItem[]>([]),
}) as SessionContext
const rpc = useRpc()

onMounted(async () => {
  const summary = await rpc.value!['vite:rolldown:get-session-summary']!({
    session: params.session,
  })
  session.rootDir = summary.rootDir
  session.modulesList = summary.modules.map(mod => ({
    id: mod.id,
    fileType: getFileTypeFromName(mod.id).name,
    imports: mod.imports ?? [],
    importers: mod.importers ?? [],
  }))
  isLoading.value = false
})
</script>

<template>
  <div v-if="isLoading">
    <div p10>
      Loading...
    </div>
  </div>
  <NuxtPage v-else :session="session" />
</template>
