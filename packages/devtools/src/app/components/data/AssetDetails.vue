<script setup lang="ts">
import type { Asset as AssetInfo } from '@rolldown/debug'
import type { RolldownAssetInfo, RolldownChunkInfo, SessionContext } from '~~/shared/types'
import { useRpc } from '#imports'
import { computed, ref } from 'vue'
import { settings } from '~~/app/state/settings'

const props = defineProps<{
  chunks: RolldownChunkInfo[]
  session: SessionContext
  asset: RolldownAssetInfo
  importers: AssetInfo[]
}>()

const rpc = useRpc()
const showSource = ref(false)
const assetChunks = computed(() => props.chunks.filter(c => c.chunk_id === props.asset.chunk_id))

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
        <CodeDiffEditor
          :from="asset.content!"
          :to="asset.content!"
          :diff="false"
          :one-column="true"
        />
      </div>
    </template>
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
    <template v-if="importers.length">
      <div op50>
        Importers
      </div>
      <div flex="~ col gap-2">
        <AssetsListItem
          v-for="asset in importers"
          :key="asset.filename"
          :asset="asset"
        />
      </div>
    </template>
  </div>
</template>
