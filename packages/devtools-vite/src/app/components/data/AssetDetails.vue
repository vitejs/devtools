<script setup lang="ts">
import type { Asset as AssetInfo } from '@rolldown/debug'
import type { RolldownAssetInfo, RolldownChunkInfo, SessionContext } from '~~/shared/types'
import { useRpc } from '#imports'
import { useAsyncState } from '@vueuse/core'
import { computed, ref } from 'vue'
import { settings } from '~~/app/state/settings'

const props = withDefaults(defineProps<{
  session: SessionContext
  asset: RolldownAssetInfo
  chunks?: RolldownChunkInfo[]
  importers?: AssetInfo[]
  imports?: AssetInfo[]
  lazy?: boolean
}>(), {
  lazy: false,
})

const rpc = useRpc()
const showSource = ref(false)
const { state } = useAsyncState(
  async () => {
    if (!props.lazy)
      return

    const res = await rpc.value!['vite:rolldown:get-asset-details']?.({
      session: props.session.id,
      id: props.asset.filename,
    })
    if ('chunk' in res) {
      return {
        chunks: [{ ...res?.chunk, type: 'chunk' }],
        importers: res?.importers,
        imports: res?.imports,
      } as {
        chunks: RolldownChunkInfo[]
        importers: AssetInfo[]
        imports: AssetInfo[]
      }
    }
    else {
      return {
        chunks: [],
        importers: [],
        imports: [],
      } as {
        chunks: RolldownChunkInfo[]
        importers: AssetInfo[]
        imports: AssetInfo[]
      }
    }
  },
  null,
)
const assetChunks = computed(() => props.lazy ? state.value?.chunks : props.chunks?.filter(c => c.chunk_id === props.asset.chunk_id))
const _importers = computed(() => props.lazy ? state.value?.importers : props.importers)
const _imports = computed(() => props.lazy ? state.value?.imports : props.imports)

function openInEditor() {
  rpc.value!['vite:open-in-editor'](`${props.session.meta.dir}/${props.asset.filename}`)
}
</script>

<template>
  <div flex="~ col gap-3">
    <div flex="~ gap-4 items-center wrap">
      <div flex="~ gap-2 items-center">
        <div i-catppuccin-java-class-abstract />
        <div>{{ asset.filename }}</div>
        <DisplayFileSizeBadge :bytes="asset.size" text-sm />
        <DisplayBadge :text="asset.type" />
      </div>
      <div flex-auto />
      <div flex="~ gap-2">
        <button btn-action @click="openInEditor">
          <div i-carbon-launch />
          Open in editor
        </button>
        <button btn-action @click="showSource = true">
          <div i-ph-file-text />
          View source
        </button>
      </div>
    </div>

    <template v-if="showSource">
      <div flex="~ gap-2 items-center">
        <div op50>
          Source
        </div>
        <span flex-auto />
        <DisplayIconButton
          title="Line Wrapping"
          class-icon="i-carbon-text-wrap"
          :active="settings.codeviewerLineWrap"
          @click="settings.codeviewerLineWrap = !settings.codeviewerLineWrap"
        />
        <DisplayCloseButton @click="showSource = false" />
      </div>
      <div class="w-full of-auto px2 py1" border="~ base rounded-lg">
        <CodeViewer
          :code="asset.content!"
        />
      </div>
    </template>

    <div v-if="assetChunks && assetChunks.length > 0" flex="~ col gap-4">
      <div flex="~ col gap-2">
        <div op50>
          Chunks
        </div>
        <div v-for="chunk of assetChunks" :key="chunk.chunk_id" border="~ base rounded-lg" px2 py1>
          <DataChunkDetails
            :chunk="chunk"
            :session="session"
            :show-modules="false"
          />
        </div>
      </div>
      <template v-if="_importers?.length || _imports?.length">
        <div flex="~ col gap-2">
          <div op50>
            Asset Relationships
          </div>
          <DataAssetRelationships
            :importers="_importers"
            :imports="_imports"
          />
        </div>
      </template>
    </div>
    <div v-else flex="~ col gap-1">
      <!-- For other situation -->
      <div op50>
        [Non-Module Asset]
      </div>
      <div v-if="asset.filename.endsWith('.map')" flex="~ items-center gap-2">
        <span op50>Source Map for</span> <DisplayBadge :text="JSON.parse(asset.content!).file" />
      </div>
    </div>
  </div>
</template>
