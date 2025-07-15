<script setup lang="ts">
import type { RolldownEvent } from '~~/node/rolldown/events-manager'
import type { SessionContext } from '~~/shared/types'
import { Dropdown as VDropdown } from 'floating-vue'
import { withDefaults } from 'vue'

type FIELDS = 'module_id' | 'action' | 'content' | 'timestamp' | 'event_id' | 'plugin_name' | '*'

const props = withDefaults(
  defineProps<{
    events: RolldownEvent[]
    fields?: FIELDS[]
    session: SessionContext
  }>(),
  {
    fields: () => [
      'event_id',
      'action',
      'module_id',
      'plugin_name',
      'timestamp',
      'content',
      '*',
    ],
  },
)

function omit(obj: RolldownEvent, inputs: string[]) {
  const fields = new Set(inputs)
  if (fields.has('content')) {
    fields.add('content')
  }
  if (fields.has('plugin_name')) {
    fields.add('plugin_index')
  }
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !fields.has(key)),
  )
}

function getContent(event: RolldownEvent) {
  if (event.action === 'HookLoadCallEnd' || event.action === 'HookTransformCallStart' || event.action === 'HookTransformCallEnd') {
    return event.content
  }
  return null
}
</script>

<template>
  <div v-if="!events.length">
    <div p5 italic>
      No events found
    </div>
  </div>
  <table>
    <tbody>
      <tr v-for="event of props.events" :key="event.event_id">
        <template v-for="field of props.fields" :key="field">
          <td px2>
            <DisplayModuleId
              v-if="field === 'module_id'"
              :id="'module_id' in event ? event.module_id : ''"
              :session="session"
            />
            <DisplayBadge v-else-if="field === 'action'" :text="event.action" />
            <div v-else-if="field === 'plugin_name' && 'plugin_name' in event">
              <DisplayPluginName font-mono :name="event.plugin_name" />
              <code op50>#{{ event.plugin_id }}</code>
            </div>
            <div v-else-if="field === 'event_id'">
              {{ event.event_id }}
            </div>
            <VDropdown v-else-if="field === 'content' && getContent(event)">
              <div i-ph-code />
              <template #popper>
                <pre p1 text-sm v-text="getContent(event)" />
              </template>
            </VDropdown>
            <DisplayTimestamp v-else-if="field === 'timestamp' && 'timestamp' in event" text-sm :timestamp="event.timestamp" />
            <pre v-else-if="field === '*'" text-sm v-text="omit(event, fields)" />
          </td>
        </template>
      </tr>
    </tbody>
  </table>
</template>
