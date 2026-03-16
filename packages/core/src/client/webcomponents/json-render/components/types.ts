import { ref, watchEffect } from 'vue'
import { getIconifySvg } from '../../utils/iconify'

export interface RegistryComponentProps {
  element: { type: string, props: Record<string, any> }
  emit: (event: string) => void
  on: (event: string) => { emit: () => void, shouldPreventDefault: boolean, bound: boolean }
  bindings?: Record<string, string>
  loading?: boolean
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
