import type { Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'

export interface ClientSettings {
  codeviewerLineWrap: boolean
  codeviewerDiffPanelSize: number
  flowModuleGraphView: 'list' | 'graph' | 'folder'
  flowExpandResolveId: boolean
  flowExpandTransforms: boolean
  flowExpandLoads: boolean
  flowExpandChunks: boolean
  flowExpandAssets: boolean
  flowShowAllTransforms: boolean
  flowShowAllLoads: boolean
  assetViewType: 'list' | 'folder' | 'flamechart'
}

export const settings = useLocalStorage<ClientSettings>(
  'vite-devtools-settings',
  {
    codeviewerLineWrap: false,
    codeviewerDiffPanelSize: 200,
    flowModuleGraphView: 'list',
    flowExpandResolveId: true,
    flowExpandTransforms: true,
    flowExpandLoads: true,
    flowExpandChunks: true,
    flowExpandAssets: true,
    flowShowAllTransforms: false,
    flowShowAllLoads: false,
    assetViewType: 'list',
  },
  {
    mergeDefaults: true,
  },
)

export function objectRefToRefs<T extends object>(obj: Ref<T>): {
  [K in keyof T]: Ref<T[K]>
} {
  const cache = new Map<keyof T, Ref<T[keyof T]>>()
  return new Proxy(obj.value, {
    get(target, prop) {
      if (!cache.has(prop as keyof T)) {
        cache.set(prop as keyof T, computed({
          get() {
            return target[prop as keyof T]
          },
          set(value) {
            target[prop as keyof T] = value
          },
        }))
      }
      return cache.get(prop as keyof T)
    },
  }) as any
}

export const settingsRefs = objectRefToRefs(settings)
