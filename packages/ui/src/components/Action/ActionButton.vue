<!-- @description actions. `variant` action/primary/text, polymorphic `href`/`as`, `icon`, `loading`. -->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Render as another element/component (e.g. `RouterLink`). */
    as?: string
    to?: string
    href?: string
    icon?: string
    variant?: 'action' | 'primary' | 'text'
    size?: 'sm' | 'md'
    loading?: boolean
    disabled?: boolean
  }>(),
  { variant: 'action', size: 'md' },
)

const tag = computed(() => {
  if (props.as)
    return props.as
  if (props.href != null || props.to != null)
    return 'a'
  return 'button'
})

const isLink = computed(() => tag.value === 'a')
const isButton = computed(() => tag.value === 'button')
const sm = computed(() => props.size === 'sm')

const variantClass = computed(() => {
  // `primary` is the solid filled button, `text` a borderless label; both
  // mirror antfu/design.
  if (props.variant === 'primary')
    return sm.value ? 'btn-primary text-sm px-2.5! py-1!' : 'btn-primary'
  if (props.variant === 'text')
    return `inline-flex items-center gap-1.5 op75 hover:op100 transition${sm.value ? ' text-sm' : ''}`
  return sm.value ? 'btn-action-sm' : 'btn-action'
})

const disabledState = computed(() => props.disabled || props.loading)
</script>

<template>
  <component
    :is="tag"
    :class="[variantClass, { 'pointer-events-none op-mute': disabledState && !isButton }]"
    :href="isLink ? (href ?? to) : undefined"
    :to="as && to != null ? to : undefined"
    :disabled="isButton ? disabledState : undefined"
    :aria-disabled="disabledState || undefined"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="i-svg-spinners-8-dots-rotate" aria-hidden="true" />
    <span v-else-if="icon" :class="icon" aria-hidden="true" />
    <slot />
  </component>
</template>
