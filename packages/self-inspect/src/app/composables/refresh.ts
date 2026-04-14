import { onScopeDispose, ref, shallowRef } from 'vue'

const refreshFn = shallowRef<(() => Promise<void>) | null>(null)
const loading = ref(false)

export function useRefreshProvider(fn: () => Promise<void>) {
  refreshFn.value = fn
  onScopeDispose(() => {
    refreshFn.value = null
  })
}

export function useRefresh() {
  async function refresh() {
    if (!refreshFn.value || loading.value)
      return
    loading.value = true
    try {
      await refreshFn.value()
    }
    finally {
      loading.value = false
    }
  }

  return { refresh, loading }
}
