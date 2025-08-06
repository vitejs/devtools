<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'

const props = defineProps<{
  session: SessionContext
}>()
const rpc = useRpc()
const query = useRoute().query

const events = useAsyncState(
  async () => {
    return await rpc.value!['vite:rolldown:get-module-raw-events']?.({
      session: props.session.id,
      module: query.module as string,
    })
  },
  {
    events: [],
  },
)
</script>

<template>
  <VisualLoading v-if="events.isLoading" />
  <div>
    <DataRawEventsTable
      v-if="events.isReady"
      :events="events.state.value.events"
      :session="session"
    />
    <div v-else>
      <VisualLoading />
    </div>
  </div>
</template>
