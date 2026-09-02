<script setup lang="ts">
import DisplayBadge from '@vitejs/devtools-ui/components/Display/DisplayBadge.vue'
import { Tooltip } from 'floating-vue'
import { relative } from 'pathe'
import { computed } from 'vue'
import { useRoute } from '#app/composables/router'
import { NuxtLink } from '#components'

const props = withDefaults(
  defineProps<{
    id: string
    badges?: boolean
    icon?: boolean
    link?: boolean | string
    minimal?: boolean
    kind?: string
    cwd?: string
    disableTooltip?: boolean
  }>(),
  {
    icon: true,
    disableTooltip: false,
  },
)

const route = useRoute()
const locationHash = typeof window === 'undefined' ? '' : window.location.hash

const relativePath = computed(() => {
  if (!props.id)
    return ''
  const id = props.id.replace(/%2F/g, '/')
  if (id.startsWith('./') || id.startsWith('../'))
    return id
  const cwd = props.cwd || ''
  let relate = cwd ? relative(cwd, id) : id
  if (!relate.startsWith('.'))
    relate = `./${relate}`
  if (relate.startsWith('./'))
    return relate
  if (/^(?:\.\.\/){1,3}[^.]/.test(relate))
    return relate
  return id
})

const containerClass = computed(() => 'flex items-center')
</script>

<template>
  <component
    :is="link ? NuxtLink : 'div'"
    :to="link ? (typeof link === 'string' ? link : { path: route.path, query: { ...route.query, module: id, chunk: undefined }, hash: locationHash }) : undefined"
  >
    <Tooltip
      class="my-auto text-sm font-mono block w-full"
      :triggers="['hover']"
      :delay="1200"
      :disabled="disableTooltip || (props.id?.length || 0) < 30"
      placement="bottom-start"
    >
      <div
        v-if="id"
        :class="containerClass"
      >
        <DisplayFileIcon v-if="icon" :filename="id" class="mr1.5" />
        <span class="overflow-hidden text-ellipsis break-all line-clamp-2">
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
        <span class="font-mono text-sm">
          {{ props.id }}
        </span>
      </template>
    </Tooltip>
  </component>
</template>
