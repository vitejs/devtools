import type { DevToolsDockUserEntry } from '@vitejs/devtools-kit'
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'

function _executeSetupScript(
  entry: DevToolsDockUserEntry,
  context: DockClientScriptContext,
): Promise<void> {
  const id = `${entry.type}:${entry.id}`
  return import(/* @vite-ignore */['/.devtools', 'imports'].join('-'))
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
const _setupPromises = new Map<string, Promise<void>>()
export function executeSetupScript(
  entry: DevToolsDockUserEntry,
  context: DockClientScriptContext,
): Promise<void> {
  if (_setupPromises.has(entry.id))
    return _setupPromises.get(entry.id)!
  const promise = _executeSetupScript(entry, context)
  _setupPromises.set(entry.id, promise)
  return promise
}
