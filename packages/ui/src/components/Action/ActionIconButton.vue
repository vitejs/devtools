<!-- @description a round icon-only button with a `tooltip`, `active` state, `#badge`. Compose with VueUse's `useDark` for a dark toggle. -->
<script setup lang="ts">
import { vTooltip } from 'floating-vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Render as another element/component (e.g. `RouterLink`). */
    as?: string
    to?: string
    href?: string
    icon?: string
    /** Tooltip text (floating-vue). Requires the shared floating-vue styles. */
    tooltip?: string
    active?: boolean
    disabled?: boolean
    /** Accessible label when the button has no visible text. */
    label?: string
    /** Compact, square (non-circular) icon button for dense toolbars. */
    compact?: boolean
    /** Class(es) applied when `active` — overrides the default `color-active bg-active` tint. */
    activeClass?: string
  }>(),
  {},
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

const baseClass = computed(() => (props.compact ? 'btn-icon-compact' : 'btn-icon'))
// No `size` prop: the button's own `font-size` is the size. Width/height come
// purely from the icon glyph (sized in `em` by the icon preset) plus em-based
// padding, so a `text-sm`/`text-lg`/etc. class (or any font-size) resizes the
// whole button — same convention as DisplayBadge. `!` overrides the shared
// `btn-icon(-compact)` shortcut's fixed `w-*`/`h-*`.
const sizeClass = computed(() => (props.compact ? 'w-auto! h-auto! p-[0.25em]' : 'w-auto! h-auto! p-[0.5em]'))
const activeStateClass = computed(() => (props.active ? (props.activeClass || 'color-active bg-active op100') : ''))
</script>

<template>
  <component
    :is="tag"
    v-tooltip="tooltip"
    :type="isButton ? 'button' : undefined"
    :class="[baseClass, sizeClass, activeStateClass, { 'pointer-events-none op-mute': disabled && !isButton }]"
    :href="isLink ? (href ?? to) : undefined"
    :to="as && to != null ? to : undefined"
    :disabled="isButton ? disabled : undefined"
    :aria-disabled="(disabled && !isButton) || undefined"
    :aria-label="label ?? tooltip"
    :aria-pressed="active || undefined"
  >
    <span v-if="icon" :class="icon" aria-hidden="true" />
    <slot />
    <slot name="badge" />
  </component>
</template>
