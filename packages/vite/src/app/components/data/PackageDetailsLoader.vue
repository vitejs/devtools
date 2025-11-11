<script setup lang="ts">
import type { SessionContext } from '~~/shared/types/data'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'
import { computed } from 'vue'

const props = defineProps<{
  session: SessionContext
  package: string
}>()
const emit = defineEmits<{
  (e: 'close'): void
}>()
const parsedPackage = computed(() => {
  const match = props.package.match(/^(@?[^@]+)@(.+)$/)
  const [, name, version] = match!
  return { name, version }
})
const rpc = useRpc()
const { state, isLoading } = useAsyncState(
  async () => {
    return await rpc.value.$call(
      'vite:rolldown:get-package-details',
      {
        session: props.session.id,
        id: props.package,
      },
    )
  },
  null,
)

const normalizedBundledFiles = computed(() => state.value?.files?.filter(f => !!f.transformedCodeSize) ?? [])

const importers = computed(() => {
  const pathMap = new Map()
  state.value?.files.filter(f => !!f.importers).flatMap(f => f.importers).filter(i => !i.path.startsWith(state.value?.dir ?? '')).forEach((importer) => {
    pathMap.set(importer.path, importer)
  })
  return Array.from(pathMap.values())
})

function openInNpm() {
  const url = `https://www.npmjs.com/package/${parsedPackage.value.name}`
  window.open(url, '_blank')
}
</script>

<template>
  <VisualLoading v-if="isLoading" />

  <div v-if="state" p4 relative h-full w-full of-auto z-panel-content>
    <div flex="~ col gap-3">
      <div flex="~ gap-3 items-center" :title="package">
        <div flex="~ items-center gap-1">
          <div>
            <DisplayHighlightedPackageName :name="parsedPackage.name!" />
          </div>
          <DisplayFileSizeBadge :bytes="state.transformedCodeSize" />
        </div>
        <div flex-auto />
        <button btn-action flex="~ items-center" @click="openInNpm">
          <div i-ph-arrow-square-out-duotone />
          Open in npm
        </button>
        <DisplayCloseButton
          @click="emit('close')"
        />
      </div>

      <details open="true">
        <summary op50>
          <span>Bundled Files ({{ normalizedBundledFiles.length }})</span>
        </summary>
        <DisplayExpandableContainer flex="~ col gap-1" mt2 ws-nowrap :list="normalizedBundledFiles">
          <template #default="{ items }">
            <div v-for="file of items" :key="file.path" flex="~ row gap-1 items-center nowrap" hover="bg-active" border="~ base rounded" px2 py1 w-full>
              <DisplayModuleId :id="file.path" :session="session" ws-nowrap flex-1 disable-tooltip link :cwd="state.dir" />
              <span inline-flex>
                <DisplayFileSizeBadge :bytes="file.transformedCodeSize" text-xs />
              </span>
            </div>
          </template>
        </DisplayExpandableContainer>
      </details>

      <details open="true">
        <summary op50>
          <span>Importers ({{ importers.length }})</span>
        </summary>
        <DisplayExpandableContainer flex="~ col gap-1" mt2 ws-nowrap :list="importers">
          <template #default="{ items }">
            <div v-for="importer of items" :key="importer.path" flex="~ row gap-1 items-center nowrap" hover="bg-active" border="~ base rounded" px2 py1 w-full>
              <DisplayModuleId :id="importer.path" :session="session" ws-nowrap flex-1 disable-tooltip link />
              <DisplayBadge v-if="importer.version" :text="`v${importer.version}`" as="span" />
            </div>
          </template>
        </DisplayExpandableContainer>
      </details>
    </div>
  </div>
</template>
