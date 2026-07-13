<script setup lang="ts">
import { useTemplateRef } from 'vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
type Size = 'sm' | 'md' | 'lg'

withDefaults(defineProps<{
  /** Visual style. */
  variant?: Variant
  size?: Size
  /** Stretch to the full width of the container. */
  block?: boolean
  /** Show a spinner and disable interaction. */
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'secondary',
  size: 'md',
  block: false,
  loading: false,
  disabled: false,
  type: 'button',
})

// The single source of truth for how a DevTools button looks — shared by the
// confirm modal, the auth OTP form, the launcher view and json-render.
const variantClass: Record<Variant, string> = {
  primary: 'bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus-visible:ring-primary-500/40',
  soft: 'bg-primary/10 text-primary-700 dark:text-primary-300 hover:bg-primary/20 focus-visible:ring-primary-500/30',
  secondary: 'bg-secondary color-base hover:bg-[#8883] focus-visible:ring-primary-500/30',
  ghost: 'color-base op70 hover:op100 hover:bg-active focus-visible:ring-primary-500/30',
  danger: 'bg-red-500/12 text-red-600 dark:text-red-400 hover:bg-red-500/20 focus-visible:ring-red-500/30',
}

const sizeClass: Record<Size, string> = {
  sm: 'text-xs px3 py1.5 gap-1.5 rounded-md',
  md: 'text-sm px4 py2 gap-2 rounded-lg',
  lg: 'text-sm px4 py2.5 gap-2 rounded-xl',
}

const iconSizeClass: Record<Size, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4.5 h-4.5',
  lg: 'w-4.5 h-4.5',
}

const button = useTemplateRef<HTMLButtonElement>('button')

defineExpose({
  focus: (options?: FocusOptions) => button.value?.focus(options),
})
</script>

<template>
  <button
    ref="button"
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    class="inline-flex items-center justify-center font-medium transition-all outline-none focus-visible:ring-3 disabled:op50 disabled:pointer-events-none"
    :class="[variantClass[variant], sizeClass[size], block ? 'w-full' : '']"
  >
    <div v-if="loading" class="i-ph-spinner-gap-duotone animate-spin flex-none" :class="iconSizeClass[size]" />
    <slot v-else name="icon" />
    <slot />
  </button>
</template>
