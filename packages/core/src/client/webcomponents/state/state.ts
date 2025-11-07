import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DockClientScriptContext, DocksContext } from '@vitejs/devtools-kit/client'
import { reactive, toRefs } from 'vue'

export function useStateHandlers(
  context: DocksContext,
) {
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
      context.panel.store.open = false
      context.docks.selected = null
      return
    }
    if (context.docks.selected?.id === entry.id) {
      return
    }

    const current = context.docks.getStateById(entry.id)!

    const scriptContext: DockClientScriptContext = reactive({
      ...toRefs(context),
      current,
    })

    // If it's an action, run and return (early exit)
    if (entry?.type === 'action') {
      return await importScript(entry).then(fn => fn(scriptContext))
    }

    context.docks.selected = entry
    context.panel.store.open = true

    // If has import script, run it
    if (
      (entry.type === 'custom-render')
      || (entry.type === 'iframe' && entry.clientScript)
    ) {
      await importScript(entry).then(fn => fn(scriptContext))
    }
  }

  return {
    selectDockEntry,
  }
}
