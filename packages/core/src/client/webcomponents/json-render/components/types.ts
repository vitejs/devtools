import type { UIElement } from '@json-render/core'
import type { PropType } from 'vue'
import { ref, watchEffect } from 'vue'
import { getIconifySvg } from '../../utils/iconify'

export interface RegistryComponentProps<Type extends string = string, Props = Record<string, any>> {
  element: UIElement<Type, Props>
  emit: (event: string) => void
  on: (event: string) => { emit: () => void, shouldPreventDefault: boolean, bound: boolean }
  bindings?: Record<string, string>
  loading?: boolean
}

/**
 * Vue props for a registry component, typed to its own element shape.
 * Replaces the untyped `props: ['element', 'emit', ...]` array form so
 * `defineComponent` infers `setup`'s `ctx` as `RegistryComponentProps<Type, Props>`
 * instead of leaving `element.props` an untyped `Record<string, any>`.
 */
export function registryProps<Type extends string = string, Props = Record<string, any>>() {
  return {
    element: { type: Object as PropType<UIElement<Type, Props>>, required: true as const },
    emit: { type: Function as PropType<(event: string) => void>, required: true as const },
    on: { type: Function as PropType<(event: string) => { emit: () => void, shouldPreventDefault: boolean, bound: boolean }>, required: true as const },
    bindings: { type: Object as PropType<Record<string, string>>, required: false as const },
    loading: { type: Boolean, required: false as const },
  }
}

export function useIconSvg(getName: () => string | undefined) {
  const svg = ref<string | null>(null)
  watchEffect(async () => {
    const name = getName()
    if (!name) {
      svg.value = null
      return
    }
    const match = name.match(/^(?:i-)?([\w-]+):([\w-]+)$/)
    if (match && match[1] && match[2]) {
      svg.value = await getIconifySvg(match[1], match[2])
    }
  })
  return svg
}
