<script setup lang="ts">
import type { ModuleInfo, RolldownChunkInfo, RolldownModuleFlowNode, RolldownModuleNoChanges, RolldownModuleNoChangesHide, RolldownModuleTransformInfo, SessionContext } from '~~/shared/types'
import { Menu as VMenu } from 'floating-vue'
import { computed, shallowRef, toRefs, watch } from 'vue'
import { settingsRefs } from '~/state/settings'
import PluginName from '../display/PluginName.vue'

const props = defineProps<{
  info: ModuleInfo
  session: SessionContext
  transformsLoading: boolean
}>()
const emit = defineEmits<{
  (e: 'select', v: boolean): void
}>()
const { info } = toRefs(props)

const {
  flowShowAllTransforms,
  flowShowAllLoads,
  flowExpandTransforms,
  flowExpandLoads,
  flowExpandResolveId,
  flowExpandChunks,
  flowExpandAssets,
} = settingsRefs

const selected = shallowRef<RolldownChunkInfo | RolldownModuleFlowNode | null>(null)

const resolveIds = computed(() => info?.value?.resolve_ids ?? [])

const transforms = computed((): (RolldownModuleNoChanges | RolldownModuleNoChangesHide | RolldownModuleTransformInfo)[] => {
  const unchanged = info?.value?.transforms?.filter(t => t.content_from === t.content_to)
  const changed = info?.value?.transforms?.filter(t => t.content_from !== t.content_to)

  if (flowShowAllTransforms.value && !unchanged?.length)
    return info?.value?.transforms ?? []

  if (flowShowAllTransforms.value && unchanged?.length) {
    return [
      ...(info.value.transforms ?? []),
      ({
        type: 'no_changes_hide',
        id: 'no_changes_hide',
        count: unchanged?.length ?? 0,
        duration: unchanged?.reduce((acc, t) => acc + t.duration, 0) ?? 0,
      } satisfies RolldownModuleNoChangesHide),
    ]
  }

  if (!unchanged?.length)
    return changed ?? []

  return [
    ({
      type: 'no_changes_collapsed',
      id: 'no_changes_collapsed',
      count: unchanged?.length ?? 0,
      duration: unchanged?.reduce((acc, t) => acc + t.duration, 0) ?? 0,
    } satisfies RolldownModuleNoChanges),
    ...(changed ?? []),
  ]
})

const loads = computed(() => {
  const unchanged = info?.value?.loads?.filter(l => !l.content)
  const changed = info?.value?.loads?.filter(l => l.content)

  if (flowShowAllLoads.value && !unchanged?.length)
    return info?.value?.loads ?? []

  if (flowShowAllLoads.value && unchanged?.length) {
    return [
      ...(info.value.loads ?? []),
      ({
        type: 'no_changes_hide',
        id: 'no_changes_hide',
        count: unchanged?.length ?? 0,
        duration: unchanged?.reduce((acc, t) => acc + t.duration, 0) ?? 0,
      } satisfies RolldownModuleNoChangesHide),
    ]
  }

  if (!unchanged?.length)
    return changed ?? []

  return [
    ({
      type: 'no_changes_collapsed',
      id: 'no_changes_collapsed',
      count: unchanged?.length ?? 0,
      duration: unchanged?.reduce((acc, t) => acc + t.duration, 0) ?? 0,
    } satisfies RolldownModuleNoChanges),
    ...(changed ?? []),
  ]
})

const nodes = computed<RolldownModuleFlowNode[]>(() => [
  ...resolveIds.value,
  ...loads.value,
  ...transforms.value,
  ...info.value.chunks,
  ...info.value.assets,
])

function isSelectedAncestor(node?: RolldownModuleFlowNode) {
  if (!selected.value || !node)
    return false
  const indexSelected = nodes.value.indexOf(selected.value)
  const indexNode = nodes.value.indexOf(node)
  if (indexSelected >= indexNode)
    return true
  return false
}

watch(selected, (v) => {
  emit('select', !!v)
})

const codeDisplay = computed(() => {
  if (!selected.value)
    return null
  if (!('type' in selected.value))
    return null
  if (selected.value.type === 'transform') {
    return {
      type: 'transform',
      plugin_name: selected.value.plugin_name,
      from: selected.value.content_from,
      to: selected.value.content_to,
    }
  }
  else if (selected.value.type === 'load') {
    return {
      type: 'load',
      from: '',
      plugin_name: selected.value.plugin_name,
      to: selected.value.content,
    }
  }
  return null
})
</script>

<template>
  <div pt4 ws-nowrap>
    <div v-if="info.importers?.length" text-sm>
      <div flex>
        <VMenu>
          <FlowmapNode class-node-outer="border-dashed">
            <template #inner>
              <div flex="~ items-center gap-1" text-sm text-blue px3 py1>
                <div i-ph-arrows-merge-duotone rotate-270 />
                {{ info.importers?.length }} importers
              </div>
            </template>
          </FlowmapNode>
          <template #popper="{ hide }">
            <div p2 flex="~ col gap-1">
              <DisplayModuleId
                v-for="importer of info.importers"
                :id="importer"
                :key="importer"
                :session="session"
                :link="true"
                class="hover:bg-active"
                px2 py1 rounded
                @click="hide"
              />
            </div>
          </template>
        </VMenu>
      </div>
      <div
        pl-10 border="r" h-4 w-1px z-flowmap-line
        class="border-flow-line border-dashed"
      />
    </div>
    <div flex="~">
      <FlowmapNode
        :lines="{ bottom: true }"
        :active="selected != null"
      >
        <template #content>
          <div p2>
            <DisplayModuleId
              :id="info.id"
              :session="session"
            />
          </div>
        </template>
      </FlowmapNode>
      <template v-if="info.imports?.length">
        <div w-10 border="t base dashed" mya />
        <VMenu mya>
          <FlowmapNode class-node-outer="border-dashed">
            <template #inner>
              <div flex="~ items-center gap-1" text-sm text-orange px3 py1>
                <div i-ph-arrows-split-duotone rotate-270 />
                {{ info.imports?.length }} imports
              </div>
            </template>
          </FlowmapNode>
          <template #popper="{ hide }">
            <div p2 flex="~ col gap-1">
              <DisplayModuleId
                v-for="imp of info.imports"
                :id="imp.module_id"
                :key="imp.module_id"
                :kind="imp.kind"
                :session="session"
                :link="true"
                class="hover:bg-active"
                px2 py1 rounded
                @click="hide"
              />
            </div>
          </template>
        </VMenu>
      </template>
    </div>
    <div flex="~ gap-10" min-w-300>
      <div select-none w-max>
        <FlowmapExpandable
          v-model:expanded="flowExpandResolveId"
          :expandable="resolveIds.length > 0"
          :class-root-node="resolveIds.length === 0 ? 'border-dashed' : ''"
          :active-start="isSelectedAncestor(resolveIds[0] || loads[0])"
          :active-end="isSelectedAncestor(loads[0])"
        >
          <template #node>
            <div i-ph-magnifying-glass-duotone /> Resolve Id
            <span op50 text-xs>({{ info.resolve_ids.length }})</span>
          </template>
          <template #container>
            <div>
              <FlowmapNodeModuleInfo
                v-for="(item, index) of resolveIds"
                :key="item.id"
                :item="item"
                :session="session"
                :active="isSelectedAncestor(item)"
                :class="index > 0 ? 'pt-2' : ''"
                @select="e => selected = e"
              />
            </div>
          </template>
        </FlowmapExpandable>

        <FlowmapExpandable
          v-model:expanded="flowExpandLoads"
          :expandable="loads.length > 0"
          :class-root-node="loads.length === 0 ? 'border-dashed' : ''"
          :active-start="isSelectedAncestor(loads[0])"
          :active-end="isSelectedAncestor(transforms[0])"
        >
          <template #node>
            <div i-ph-upload-simple-duotone /> Load
            <span op50 text-xs>({{ info.loads.length }})</span>
          </template>
          <template #container>
            <div>
              <FlowmapNodeModuleInfo
                v-for="(item, index) of loads"
                :key="item.id"
                :item="item"
                :session="session"
                :active="isSelectedAncestor(item)"
                :class="index > 0 && item.type !== 'no_changes_hide' ? 'pt-2' : ''"
                @select="e => selected = e"
                @toggle-show-all="flowShowAllLoads = !flowShowAllLoads"
              />
            </div>
          </template>
        </FlowmapExpandable>

        <FlowmapExpandable
          v-model:expanded="flowExpandTransforms"
          :expandable="transforms.length > 0"
          :class-root-node="transforms.length === 0 ? 'border-dashed' : ''"
          :active-start="isSelectedAncestor(transforms[0])"
          :active-end="isSelectedAncestor(info.chunks[0] || transforms.at(-1))"
        >
          <template #node>
            <div i-ph-magic-wand-duotone /> Transform
            <span v-if="transformsLoading" i-ph-spinner animate-spin />
            <span v-else op50 text-xs>({{ info.transforms.length }})</span>
          </template>
          <template #container>
            <div>
              <FlowmapNodeModuleInfo
                v-for="(item, index) of transforms"
                :key="item.id"
                :item="item"
                :session="session"
                :active="isSelectedAncestor(item)"
                :class="index > 0 && item.type !== 'no_changes_hide' ? 'pt-2' : ''"
                @select="e => selected = e"
                @toggle-show-all="flowShowAllTransforms = !flowShowAllTransforms"
              />
            </div>
          </template>
        </FlowmapExpandable>

        <FlowmapExpandable
          v-model:expanded="flowExpandChunks"
          :lines="{ top: true }"
          :expandable="info.chunks.length > 0"
          :class-root-node="info.chunks.length === 0 ? 'border-dashed' : ''"
          :active-start="isSelectedAncestor(info.chunks[0])"
          :active-end="isSelectedAncestor(info.chunks.at(-1))"
          pl6 pt4
        >
          <template #node>
            <div i-ph-shapes-duotone /> Chunk
            <span op50 text-xs>({{ info.chunks.length }})</span>
          </template>
          <template #container>
            <FlowmapNodeChunkInfo
              v-for="chunk of info.chunks"
              :key="chunk.chunk_id"
              :item="chunk"
              :active="isSelectedAncestor(chunk)"
              :session="session"
              @select="e => selected = e"
            />
          </template>
        </FlowmapExpandable>

        <!-- <FlowmapNode :lines="{ top: true, bottom: true }" pl6 pt4>
          <template #content>
            <div i-ph-tree-duotone /> Tree shake
          </template>
        </FlowmapNode> -->

        <FlowmapExpandable
          v-model:expanded="flowExpandAssets"
          :lines="{ top: true }"
          :expandable="info.assets.length > 0"
          :class-root-node="info.assets.length === 0 ? 'border-dashed' : ''"
          :active-start="isSelectedAncestor(info.assets[0])"
          :active-end="isSelectedAncestor(info.assets.at(-1))"
          :show-tail="false"
          pl6 pt4
        >
          <template #node>
            <div i-ph-package-duotone /> Assets
            <span op50 text-xs>({{ info.assets.length }})</span>
          </template>
          <template #container>
            <FlowmapNodeAssetInfo
              v-for="asset of info.assets"
              :key="asset.filename"
              :item="asset"
              :active="isSelectedAncestor(asset)"
              :session="session"
              @select="e => selected = e"
            />
          </template>
        </FlowmapExpandable>
      </div>

      <div
        w-259
        :class="codeDisplay?.from && codeDisplay?.to ? '' : 'border-dashed'"
        border="~ base rounded-lg" of-hidden max-h-120vh m4 flex="~ col"
      >
        <template v-if="selected?.type === 'chunk'">
          <div p4 h-full of-auto>
            <DataChunkDetails
              :chunk="selected"
              :session="session"
            />
          </div>
        </template>
        <template v-else-if="selected?.type === 'asset'">
          <div p4>
            <DataAssetDetails
              :asset="selected"
              :session="session"
              :chunks="info.chunks"
            />
          </div>
        </template>
        <template v-else-if="codeDisplay?.from && codeDisplay?.to">
          <div pl4 p2 font-mono border="b base" flex="~ items-center gap-2" h-max-100vh>
            <PluginName :name="codeDisplay?.plugin_name ?? ''" />
            <span v-if="codeDisplay?.type" op50 text-xs>
              {{ codeDisplay?.type === 'load' ? 'Load' : 'Transform' }}
            </span>
            <div flex-auto />
            <DisplayCloseButton @click="selected = null" />
          </div>
          <CodeDiffEditor
            :from="codeDisplay?.from ?? ''"
            :to="codeDisplay?.to ?? ''"
            :diff="true"
            :one-column="false"
          />
        </template>
        <!-- TODO: show more info with selected node -->
        <span v-else op50 italic ma>
          Select a node to view
        </span>
      </div>
    </div>
  </div>
</template>
