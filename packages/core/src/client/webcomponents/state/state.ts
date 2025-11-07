import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DockClientScriptContext, DockClientScriptCurrent, DockClientScriptDocks } from '@vitejs/devtools-kit/client'
import type { DockContext } from './dock'
import { computed, reactive } from 'vue'

export function useStateHandlers(
  context: DockContext,
) {
  const docks: DockClientScriptDocks = reactive({
    switchEntry: async (id: string | null) => {
      if (id === null) {
        selectDockEntry(undefined)
        return true
      }
      const entry = context.dockEntries.find((d: DevToolsDockEntry) => d.id === id)
      if (!entry) {
        return false
      }
      selectDockEntry(entry)
      return true
    },
    minimize: async () => {
      context.state.open = false
    },
    reveal: async () => {
      context.state.open = true
    },
  })

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
      context.state.open = false
      context.selected = null
      return
    }

    const current: DockClientScriptCurrent = reactive({
      entryMeta: entry,
      state: computed<'active' | 'inactive'>({
        get() {
          return context.selected?.id === entry.id ? 'active' : 'inactive'
        },
        set(val) {
          if (val === 'active')
            context.selected = entry
          else if (context.selected?.id === entry.id)
            context.selected = null
        },
      }),
    })

    const scriptContext: DockClientScriptContext = reactive({
      rpc: context.rpc,
      docks,
      current,
      clientType: context.clientType,
    })

    // If it's an action, run and return (early exit)
    if (entry?.type === 'action') {
      return await importScript(entry).then(fn => fn(scriptContext))
    }

    context.selected = entry
    context.state.open = true

    // If has import script, run it
    if (
      (entry.type === 'custom-render')
      || (entry.type === 'iframe' && entry.clientScript)
    ) {
      await importScript(entry).then(fn => fn(scriptContext))
    }
  }

  return {
    docks,
    selectDockEntry,
  }
}
