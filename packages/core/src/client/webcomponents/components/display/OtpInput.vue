<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { computed, nextTick, ref } from 'vue'

const props = withDefaults(defineProps<{
  /** The current code (controlled). */
  modelValue: string
  /** Number of digits. */
  length?: number
  disabled?: boolean
  /** Error state — paints the boxes red and shakes them. */
  invalid?: boolean
  /** Focus the first box on mount. */
  autofocus?: boolean
  /** Accessible label for the group. */
  label?: string
}>(), {
  length: 6,
  disabled: false,
  invalid: false,
  autofocus: true,
  label: 'One-time authorization code',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  /** Emitted once every box is filled. */
  (e: 'complete', value: string): void
}>()

const boxes = ref<HTMLInputElement[]>([])

/** The code split into exactly `length` slots (empty string for blanks). */
const digits = computed(() =>
  Array.from({ length: props.length }, (_, i) => props.modelValue[i] ?? ''),
)

function setBoxRef(el: Element | ComponentPublicInstance | null, i: number): void {
  if (el)
    boxes.value[i] = el as HTMLInputElement
}

function focusBox(i: number): void {
  const clamped = Math.max(0, Math.min(props.length - 1, i))
  nextTick(() => {
    const el = boxes.value[clamped]
    el?.focus()
    el?.select()
  })
}

function commit(next: string): void {
  const clean = next.replace(/\D/g, '').slice(0, props.length)
  if (clean !== props.modelValue)
    emit('update:modelValue', clean)
  if (clean.length === props.length)
    emit('complete', clean)
}

/** Overwrite slots starting at `from` with `chars`; returns the next index. */
function fillFrom(from: number, chars: string): number {
  const arr = digits.value.slice()
  let idx = from
  for (const c of chars) {
    if (idx >= props.length)
      break
    arr[idx] = c
    idx++
  }
  commit(arr.join(''))
  return idx
}

function onInput(i: number, event: Event): void {
  const el = event.target as HTMLInputElement
  const raw = el.value.replace(/\D/g, '')
  if (!raw) {
    const arr = digits.value.slice()
    arr[i] = ''
    commit(arr.join(''))
    return
  }
  // Multiple chars can arrive at once (autofill / fast typing) — spread them.
  const next = fillFrom(i, raw)
  focusBox(next)
}

function onKeydown(i: number, event: KeyboardEvent): void {
  switch (event.key) {
    case 'Backspace': {
      event.preventDefault()
      const arr = digits.value.slice()
      if (arr[i]) {
        arr[i] = ''
        commit(arr.join(''))
      }
      else if (i > 0) {
        arr[i - 1] = ''
        commit(arr.join(''))
        focusBox(i - 1)
      }
      break
    }
    case 'Delete': {
      event.preventDefault()
      const arr = digits.value.slice()
      arr[i] = ''
      commit(arr.join(''))
      break
    }
    case 'ArrowLeft':
      event.preventDefault()
      focusBox(i - 1)
      break
    case 'ArrowRight':
      event.preventDefault()
      focusBox(i + 1)
      break
    case 'Home':
      event.preventDefault()
      focusBox(0)
      break
    case 'End':
      event.preventDefault()
      focusBox(props.length - 1)
      break
  }
}

function onPaste(i: number, event: ClipboardEvent): void {
  event.preventDefault()
  const text = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '')
  if (!text)
    return
  const next = fillFrom(i, text.slice(0, props.length - i))
  focusBox(next)
}

function onFocus(event: FocusEvent): void {
  ;(event.target as HTMLInputElement).select()
}

function boxClass(i: number): string {
  if (props.invalid)
    return 'border-red-500/70 text-red-500'
  if (digits.value[i])
    return 'border-primary-400/60 dark:border-primary-400/50'
  return 'border-base'
}

defineExpose({
  /** Focus the first empty box (or the last one when full). */
  focus() {
    const firstEmpty = digits.value.findIndex(d => !d)
    focusBox(firstEmpty === -1 ? props.length - 1 : firstEmpty)
  },
})
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    class="flex items-center justify-center gap-2 sm:gap-2.5"
    :class="invalid ? 'vite-devtools-shake' : ''"
  >
    <input
      v-for="(digit, i) in digits"
      :key="i"
      :ref="el => setBoxRef(el, i)"
      :value="digit"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      data-1p-ignore
      data-lpignore="true"
      data-bwignore="true"
      data-form-type="other"
      :autofocus="autofocus && i === 0"
      :aria-label="`Digit ${i + 1} of ${length}`"
      :aria-invalid="invalid || undefined"
      :disabled="disabled"
      maxlength="1"
      class="w-11 h-14 text-center text-2xl font-mono tabular-nums font-medium rounded-xl border bg-base color-base caret-primary-500 outline-none transition-all duration-150 focus:border-primary-500 focus:ring-3 focus:ring-primary-500/25 disabled:op40 disabled:pointer-events-none"
      :class="boxClass(i)"
      @input="onInput(i, $event)"
      @keydown="onKeydown(i, $event)"
      @paste="onPaste(i, $event)"
      @focus="onFocus"
    >
  </div>
</template>
