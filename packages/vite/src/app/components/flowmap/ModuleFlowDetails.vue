<script setup lang="ts">
import type { RolldownChunkInfo, RolldownModuleFlowNode, RolldownResolveInfo, SessionContext } from '~~/shared/types'
import { computed } from 'vue'
import { settings } from '~~/app/state/settings'
import PluginName from '../display/PluginName.vue'

const props = defineProps<{
  selected: RolldownChunkInfo | RolldownModuleFlowNode | null
  session: SessionContext
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const codeDisplay = computed(() => {
  if (!props.selected)
    return null
  if (!('type' in props.selected))
    return null
  if (props.selected.type === 'transform') {
    return {
      type: 'transform',
      plugin_name: props.selected.plugin_name,
      from: props.selected.content_from,
      to: props.selected.content_to,
    }
  }
  else if (props.selected.type === 'load') {
    return {
      type: 'load',
      from: '',
      plugin_name: props.selected.plugin_name,
      to: props.selected.content,
    }
  }
  return null
})

const resolveInfo = computed<RolldownResolveInfo | null>(() => {
  if (!props.selected || !('type' in props.selected))
    return null
  if (props.selected.type === 'resolve')
    return props.selected
  return null
})

const importerModule = computed(() => {
  if (!resolveInfo.value?.importer)
    return undefined
  return props.session.modulesList.find(m => m.id === resolveInfo.value!.importer)
})

function handleClose() {
  emit('close')
}
</script>

<template>
  <div
    bg-glass w-full h-full
    :class="codeDisplay?.from && codeDisplay?.to ? '' : 'border-dashed'"
    border="~ base rounded-lg" of-hidden flex="~ col"
  >
    <template v-if="selected?.type === 'chunk'">
      <div p4 h-full of-auto style="overscroll-behavior: contain">
        <DataChunkDetails
          :chunk="selected"
          :session="session"
        />
      </div>
    </template>
    <template v-else-if="selected?.type === 'asset'">
      <div p4 h-full of-auto style="overscroll-behavior: contain">
        <DataAssetDetails
          :asset="selected"
          :session="session"
          :lazy="true"
        />
      </div>
    </template>
    <template v-else-if="codeDisplay?.from && codeDisplay?.to">
      <div pl4 p2 font-mono border="b base" flex="~ items-center gap-2">
        <PluginName :name="codeDisplay?.plugin_name ?? ''" />
        <span v-if="codeDisplay?.type" op50 text-xs>
          {{ codeDisplay?.type === 'load' ? 'Load' : 'Transform' }}
        </span>
        <div flex-auto />
        <DisplayIconButton
          title="Line Wrapping"
          class-icon="i-ph-arrow-u-down-left-duotone"
          :active="settings.codeviewerLineWrap"
          @click="settings.codeviewerLineWrap = !settings.codeviewerLineWrap"
        />
        <DisplayCloseButton @click.stop="handleClose" />
      </div>
      <CodeDiffEditor
        :from="codeDisplay?.from ?? ''"
        :to="codeDisplay?.to ?? ''"
        :diff="true"
        :one-column="false"
      />
    </template>
    <!-- Resolve info panel -->
    <template v-else-if="resolveInfo">
      <div pl4 p2 font-mono border="b base" flex="~ items-center gap-2">
        <PluginName :name="resolveInfo.plugin_name" />
        <span op50 text-xs>Resolve</span>
        <div flex-auto />
        <DisplayCloseButton @click.stop="handleClose" />
      </div>
      <div p4 h-full of-auto flex="~ col gap-3" style="overscroll-behavior: contain">
        <div flex="~ col gap-1">
          <span op50 text-xs uppercase tracking-wide>Resolved ID</span>
          <DisplayModuleId
            v-if="resolveInfo.resolved_id"
            :id="resolveInfo.resolved_id"
            :session="session"
            link
            font-mono text-sm
          />
          <span v-else op50 italic text-sm>null (not resolved)</span>
        </div>
        <div flex="~ col gap-1">
          <span op50 text-xs uppercase tracking-wide>Module Request</span>
          <code font-mono text-sm bg-active px2 py1 rounded>{{ resolveInfo.module_request }}</code>
        </div>
        <div v-if="resolveInfo.importer" flex="~ col gap-1">
          <span op50 text-xs uppercase tracking-wide>Importer</span>
          <DisplayModuleId
            :id="resolveInfo.importer"
            :session="session"
            :link="!!importerModule"
            font-mono text-sm
          />
        </div>
        <div flex="~ gap-6">
          <div flex="~ col gap-1">
            <span op50 text-xs uppercase tracking-wide>Import Kind</span>
            <code font-mono text-sm>{{ resolveInfo.import_kind }}</code>
          </div>
          <div flex="~ col gap-1">
            <span op50 text-xs uppercase tracking-wide>Duration</span>
            <DisplayDuration :duration="resolveInfo.duration" :color="true" :factor="5" />
          </div>
        </div>
      </div>
    </template>
    <!-- Transform/Load with no content changes -->
    <template v-else-if="selected && 'type' in selected && (selected.type === 'transform' || selected.type === 'load')">
      <div pl4 p2 font-mono border="b base" flex="~ items-center gap-2">
        <PluginName :name="selected.plugin_name" />
        <span op50 text-xs>{{ selected.type === 'load' ? 'Load' : 'Transform' }}</span>
        <div flex-auto />
        <DisplayCloseButton @click.stop="handleClose" />
      </div>
      <div p4 flex="~ col gap-3 items-center justify-center" h-full>
        <div i-ph-empty-duotone text-4xl op30 />
        <span op50 text-sm>
          {{ selected.type === 'load' ? 'No content loaded' : 'No changes made' }}
        </span>
        <div flex="~ gap-4 items-center">
          <DisplayDuration :duration="selected.duration" :color="true" :factor="5" />
          <template v-if="selected.type === 'transform'">
            <div font-mono text-xs flex="~ gap-1 items-center">
              <span text-green>+{{ selected.diff_added }}</span>
              <span text-red>-{{ selected.diff_removed }}</span>
            </div>
          </template>
        </div>
      </div>
    </template>
    <!-- Collapsed no-changes summary -->
    <template v-else-if="selected && 'type' in selected && (selected.type === 'no_changes_collapsed' || selected.type === 'no_changes_hide')">
      <div pl4 p2 font-mono border="b base" flex="~ items-center gap-2">
        <span text-sm>Collapsed Plugins</span>
        <div flex-auto />
        <DisplayCloseButton @click.stop="handleClose" />
      </div>
      <div p4 flex="~ col gap-3 items-center justify-center" h-full>
        <div i-ph-stack-duotone text-4xl op30 />
        <span op50 text-sm text-center>
          {{ selected.count }} plugins did not change the content
        </span>
        <div flex="~ gap-2 items-center">
          <span op50 text-xs>Total duration:</span>
          <DisplayDuration :duration="selected.duration" :color="true" :factor="5" />
        </div>
      </div>
    </template>
    <span v-else op50 italic ma>
      No data
    </span>
  </div>
</template>
