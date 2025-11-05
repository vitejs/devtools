import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'
import type { Ref } from 'vue'
import type { DevToolsDockState } from '../components/DockProps'
import { computed, reactive } from 'vue'

export function useStateHandlers(state: Ref<DevToolsDockState>) {
  function importScript(entry: DevToolsDockEntry): Promise<(context: DockClientScriptContext) => void | Promise<void>> {
    const id = `${entry.type}:${entry.id}`
    return import(/* @vite-ignore */ ['/.devtools', 'imports'].join('-'))
      .then((module) => {
        const importsMap = module.importsMap as Record<string, () => Promise<() => void>>
        const importFn = importsMap[id]
        if (!importFn) {
          return Promise.reject(new Error(`[VITE DEVTOOLS] No import found for id: ${id}`))
        }
        return importFn()
      })
      .catch((error) => {
        // TODO: maybe popup a error toast here?
        // TODO: A unified logger API
        console.error('[VITE DEVTOOLS] Error executing import action', error)
        return Promise.reject(error)
      })
  }

  async function selectDockEntry(entry?: DevToolsDockEntry) {
    if (!entry) {
      state.value.open = false
      state.value.dockEntry = undefined
      return
    }

    const scriptContext: DockClientScriptContext = reactive({
      dockEntry: entry,
      // @ts-expect-error cast for unwraping
      dockState: computed<'active' | 'inactive'>({
        get() {
          return state.value.dockEntry?.id === entry.id ? 'active' : 'inactive'
        },
        set(val) {
          if (val === 'active')
            state.value.dockEntry = entry
          else if (state.value.dockEntry?.id === entry.id)
            state.value.dockEntry = undefined
        },
      }),
      hidePanel() {
        state.value.open = false
      },
    })

    // If it's an action, run and return (early exit)
    if (entry?.type === 'action') {
      return await importScript(entry).then(fn => fn(scriptContext))
    }

    state.value.dockEntry = entry
    state.value.open = true

    // If has import script, run it
    await importScript(entry).then(fn => fn?.(scriptContext))
  }

  return {
    selectDockEntry,
  }
}
