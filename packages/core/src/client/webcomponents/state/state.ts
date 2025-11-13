import type { DevToolsDockEntry } from '@vitejs/devtools-kit'
import type { DockClientScriptContext, DocksContext } from '@vitejs/devtools-kit/client'
import { reactive, toRefs } from 'vue'

export function useStateHandlers(
  context: DocksContext,
) {
  function _setupScript(
    entry: DevToolsDockEntry,
    context: DockClientScriptContext,
  ): Promise<void> {
    const id = `${entry.type}:${entry.id}`
    return import(/* @vite-ignore */ ['/.devtools', 'imports'].join('-'))
      .then((module) => {
        const importsMap = module.importsMap as Record<string, () => Promise<(context: DockClientScriptContext) => void>>
        const importFn = importsMap[id]
        if (!importFn) {
          return Promise.reject(new Error(`[VITE DEVTOOLS] No import found for id: ${id}`))
        }
        return importFn().then(fn => fn(context))
      })
      .catch((error) => {
        // TODO: maybe popup a error toast here?
        // TODO: A unified logger API
        console.error('[VITE DEVTOOLS] Error executing import action', error)
        return Promise.reject(error)
      })
  }

  const setupPromises = new Map<string, Promise<void>>()
  function setupScript(entry: DevToolsDockEntry, context: DockClientScriptContext): Promise<void> {
    if (setupPromises.has(entry.id))
      return setupPromises.get(entry.id)!
    const promise = _setupScript(entry, context)
    setupPromises.set(entry.id, promise)
    return promise
  }

  async function selectDockEntry(entry?: DevToolsDockEntry) {
    if (!entry) {
      context.panel.store.open = false
      context.docks.selectedId = null
      return
    }
    if (context.docks.selectedId === entry.id) {
      return
    }

    const current = context.docks.getStateById(entry.id)!

    const scriptContext: DockClientScriptContext = reactive({
      ...toRefs(context) as any,
      current,
    })

    // If has import script, run it
    if (
      (entry.type === 'action')
      || (entry.type === 'custom-render')
      || (entry.type === 'iframe' && entry.clientScript)
    ) {
      await setupScript(entry, scriptContext)
    }

    context.docks.selectedId = entry.id
    context.panel.store.open = true
  }

  return {
    selectDockEntry,
  }
}
