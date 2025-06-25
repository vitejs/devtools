<script setup lang="ts">
import type { ModuleInfo, RolldownModuleFlowNode, RolldownModuleLoadNoChanges, RolldownModuleTransformInfo, RolldownModuleTransformNoChanges, SessionContext } from '~~/shared/types'
import { Menu as VMenu } from 'floating-vue'
import { computed, ref, shallowRef, toRefs, watch } from 'vue'
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
const expandNoChangesTransform = ref(false)
const expandNoChangesLoad = ref(false)
const selected = shallowRef<RolldownModuleFlowNode | null>(null)

const resolveIds = computed(() => info?.value?.resolve_ids ?? [])

const transforms = computed((): (RolldownModuleTransformNoChanges | RolldownModuleTransformInfo)[] => {
  if (expandNoChangesTransform.value)
    return info?.value?.transforms ?? []

  const unchanged = info?.value?.transforms?.filter(t => t.source_from === t.source_to)
  const changed = info?.value?.transforms?.filter(t => t.source_from !== t.source_to)

  if (!unchanged?.length)
    return changed ?? []
  return [
    ({
      type: 'transform_no_changes',
      id: 'transform_no_changes',
      count: unchanged?.length ?? 0,
      duration: unchanged?.reduce((acc, t) => acc + t.duration, 0) ?? 0,
    } satisfies RolldownModuleTransformNoChanges),
    ...(changed ?? []),
  ]
})

const loads = computed(() => {
  if (expandNoChangesLoad.value)
    return info?.value?.loads ?? []

  const unchanged = info?.value?.loads?.filter(l => !l.source)
  const changed = info?.value?.loads?.filter(l => l.source)

  if (!unchanged?.length)
    return changed ?? []
  return [
    ({
      type: 'load_no_changes',
      id: 'load_no_changes',
      count: unchanged?.length ?? 0,
      duration: unchanged?.reduce((acc, t) => acc + t.duration, 0) ?? 0,
    } satisfies RolldownModuleLoadNoChanges),
    ...(changed ?? []),
  ]
})
const nodes = computed(() => [
  ...resolveIds.value,
  ...loads.value,
  ...transforms.value,
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

function select(node: RolldownModuleFlowNode) {
  selected.value = node
}

watch(selected, (v) => {
  emit('select', !!v)
})

function activate(node: RolldownModuleFlowNode) {
  if (node.type === 'transform_no_changes')
    expandNoChangesTransform.value = !expandNoChangesTransform.value
  else if (node.type === 'load_no_changes')
    expandNoChangesLoad.value = !expandNoChangesLoad.value
}

const codeDisplay = computed(() => {
  if (!selected.value)
    return null
  if (selected.value.type === 'transform') {
    return {
      type: 'transform',
      plugin_name: selected.value.plugin_name,
      from: selected.value.source_from,
      to: selected.value.source_to,
    }
  }
  else if (selected.value.type === 'load') {
    return {
      type: 'load',
      from: '',
      plugin_name: selected.value.plugin_name,
      to: selected.value.source,
    }
  }
  return null
})
</script>

<template>
  <div pt4 w-full min-w-full>
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
                :id="imp.id"
                :key="imp.id"
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
    <div w-full flex="~">
      <div select-none flex-1>
        <FlowmapExpandable
          :items="resolveIds"
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
                @select="select"
                @activate="activate"
              />
            </div>
          </template>
        </FlowmapExpandable>

        <FlowmapExpandable
          :items="loads"
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
                :class="index > 0 ? 'pt-2' : ''"
                @select="select"
                @activate="activate"
              />
            </div>
          </template>
        </FlowmapExpandable>

        <FlowmapExpandable
          :expandable="transforms.length > 0"
          :class-root-node="transforms.length === 0 ? 'border-dashed' : ''"
          :active-start="isSelectedAncestor(transforms[0])"
          :active-end="isSelectedAncestor(transforms.at(-1))"
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
                :class="index > 0 ? 'pt-2' : ''"
                @select="select"
                @activate="activate"
              />
            </div>
          </template>
        </FlowmapExpandable>

        <FlowmapNode :lines="{ top: true, bottom: true }" pl6 pt4>
          <template #content>
            <div i-ph-shapes-duotone /> Chunk
          </template>
        </FlowmapNode>

        <FlowmapNode :lines="{ top: true, bottom: true }" pl6 pt4>
          <template #content>
            <div i-ph-tree-duotone /> Tree shake
          </template>
        </FlowmapNode>

        <FlowmapNode :lines="{ top: true }" pl6 pt4>
          <template #content>
            <div i-ph-package-duotone /> Generate
          </template>
        </FlowmapNode>
      </div>

      <div
        v-if="codeDisplay"
        border="~ base rounded-lg" bg-glass of-hidden max-h-120vh flex-1 m4
      >
        <div pl4 p2 font-mono border="b base" flex="~ items-center gap-2" h-max-100vh>
          <PluginName :name="codeDisplay.plugin_name" />
          <span op50 text-xs>
            {{ codeDisplay.type === 'load' ? 'Load' : 'Transform' }}
          </span>
          <div flex-auto />
          <DisplayCloseButton @click="selected = null" />
        </div>
        <CodeDiffEditor
          :from="codeDisplay.from ?? ''"
          :to="codeDisplay.to ?? ''"
          :diff="true"
          :one-column="false"
        />
      </div>
    </div>
  </div>
</template>
