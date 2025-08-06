<script setup lang="ts">
import type { SessionContext } from '~~/shared/types'
import { useRoute } from '#app/composables/router'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'
import { computed } from 'vue'
import { settings } from '~~/app/state/settings'

const props = defineProps<{
  session: SessionContext
}>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const route = useRoute()
const rpc = useRpc()
const { state } = useAsyncState(
  async () => {
    const res = await rpc.value!['vite:rolldown:get-plugin-details']?.({
      session: props.session.id,
      id: route.query.plugin as string,
    })
    return res
  },
  null,
)

const processedModules = computed(() => {
  const seen = new Set()
  return state.value?.buildMetrics?.calls?.filter((call) => {
    if (seen.has(call.module)) {
      return false
    }
    seen.add(call.module)
    return true
  }) ?? []
})
</script>

<template>
  <div v-if="state" relative h-full w-full>
    <DisplayCloseButton
      absolute right-2 top-1.5
      @click="emit('close')"
    />
    <div
      bg-glass absolute left-2 top-2 z-panel-content p2
      border="~ base rounded-lg"
      flex="~ col gap-2"
    >
      <DisplayPluginName :name="state?.name!" />
      <div text-xs font-mono flex="~ items-center gap-3" ml2>
        <DisplayDuration
          :duration="10" flex="~ gap-1 items-center"
          :title="`resolveId hooks cost: ${10}ms`"
        >
          <span i-ph-magnifying-glass-duotone inline-block />
        </DisplayDuration>
        <DisplayDuration
          :duration="10" flex="~ gap-1 items-center"
          :title="`load hooks cost: ${10}ms`"
        >
          <span i-ph-upload-simple-duotone inline-block />
        </DisplayDuration>
        <DisplayDuration
          :duration="10" flex="~ gap-1 items-center"
          :title="`transform hooks cost: ${10}ms`"
        >
          <span i-ph-magic-wand-duotone inline-block />
        </DisplayDuration>
        <span op40>|</span>
        <DisplayDuration
          :duration="50" flex="~ gap-1 items-center"
          :title="`Total build cost: ${50}ms`"
        >
          <span i-ph-clock-duotone inline-block />
        </DisplayDuration>
        <span op40>|</span>
        <DisplayNumberBadge
          :number="processedModules.length" icon="i-catppuccin-java-class-abstract"
          color="transparent color-scale-neutral"
          :title="`Module processed: ${processedModules.length}`"
        />
        <span op40>|</span>
        <DisplayNumberBadge
          :number="state.buildMetrics?.calls?.length ?? 0" icon="i-ph:arrow-counter-clockwise"
          color="transparent color-scale-neutral"
          :title="`Total calls: ${state.buildMetrics?.calls?.length ?? 0}`"
        />
      </div>
      <div flex="~ gap-2">
        <button
          :class="settings.pluginDetailsViewType === 'flow' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="settings.pluginDetailsViewType = 'flow'"
        >
          <div i-ph-git-branch-duotone rotate-180 />
          Build Flow
        </button>
        <button
          :class="settings.pluginDetailsViewType === 'charts' ? 'text-primary' : ''"
          flex="~ gap-2 items-center justify-center"
          px2 py1 w-40
          border="~ base rounded-lg"
          hover="bg-active"
          @click="settings.pluginDetailsViewType = 'charts'"
        >
          <div i-ph-chart-donut-duotone />
          Charts
        </button>
      </div>
    </div>
    <div of-auto h-full pt-30>
      <DataPluginDetails :session="session" />
    </div>
  </div>
</template>

<style scoped>

</style>
