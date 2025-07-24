<script setup lang="ts">
import type { ModuleImport } from '@rolldown/debug'
import type { SessionContext } from '~~/shared/types'
import { useRoute } from '#app/composables/router'
import { NuxtLink } from '#components'
import { Tooltip } from 'floating-vue'
import { relative } from 'pathe'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    id: string
    badges?: boolean
    icon?: boolean
    link?: boolean | string
    minimal?: boolean
    kind?: ModuleImport['kind']
    session?: SessionContext
    cwd?: string
  }>(),
  {
    icon: true,
  },
)

const route = useRoute()
const location = window.location

const relativePath = computed(() => {
  if (!props.id)
    return ''
  const id = props.id.replace(/%2F/g, '/')
  const cwd = props.cwd || props.session!.meta.cwd
  let relate = cwd ? relative(cwd, id) : id
  if (!relate.startsWith('.'))
    relate = `./${relate}`
  if (relate.startsWith('./'))
    return relate
  if (relate.match(/^(?:\.\.\/){1,3}[^.]/))
    return relate
  return id
})

const containerClass = computed(() => {
  return 'flex items-center'
})
</script>

<template>
  <component
    :is="link ? NuxtLink : 'div'"
    :to="link ? (typeof link === 'string' ? link : { path: route.path, query: { ...route.query, module: id }, hash: location.hash }) : undefined"
  >
    <Tooltip
      my-auto text-sm font-mono block w-full
      :triggers="['hover']"
      :delay="1200"
      :disabled="(props.id?.length || 0) < 30"
      placement="bottom-start"
    >
      <div
        v-if="id"
        :class="containerClass"
      >
        <DisplayFileIcon v-if="icon" :filename="id" mr1.5 />
        <span overflow-hidden text-ellipsis break-all line-clamp-2>
          <DisplayHighlightedPath :path="relativePath" :minimal="minimal" />
        </span>
        <slot />
        <DisplayBadge
          v-if="kind"
          class="ml1"
          :text="kind"
        />
        <!-- <DisplayBadge
          v-if="isVirtual"
          class="ml1"
          text="virtual"
        /> -->
      </div>
      <div>
        <slot name="detail" />
      </div>
      <template #popper>
        <span font-mono text-sm>
          {{ props.id }}
        </span>
      </template>
    </Tooltip>
  </component>
</template>
