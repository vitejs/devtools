import type { DevToolsDockUserEntry } from '@vitejs/devtools-kit'
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'
import {
  DEVTOOLS_DOCK_IMPORTS_FILENAME,
  DEVTOOLS_DOCK_IMPORTS_VIRTUAL_ID,
  DEVTOOLS_MOUNT_PATH,
} from '@vitejs/devtools-kit/constants'

async function loadImportsMapModule(context: DockClientScriptContext): Promise<{
  importsMap: Record<string, () => Promise<(context: DockClientScriptContext) => void>>
}> {
  const candidates = context.rpc.connectionMeta.backend === 'static'
    ? [`${DEVTOOLS_MOUNT_PATH}${DEVTOOLS_DOCK_IMPORTS_FILENAME}`, DEVTOOLS_DOCK_IMPORTS_VIRTUAL_ID]
    : [DEVTOOLS_DOCK_IMPORTS_VIRTUAL_ID]

  const errors: unknown[] = []
  for (const id of candidates) {
    try {
      return await import(/* @vite-ignore */ id) as {
        importsMap: Record<string, () => Promise<(context: DockClientScriptContext) => void>>
      }
    }
    catch (error) {
      errors.push(error)
    }
  }

  throw new Error('[VITE DEVTOOLS] Failed to load imports map module', {
    cause: errors,
  })
}

function _executeSetupScript(
  entry: DevToolsDockUserEntry,
  context: DockClientScriptContext,
): Promise<void> {
  const id = `${entry.type}:${entry.id}`
  return loadImportsMapModule(context)
    .then((module) => {
      const importsMap = module.importsMap
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
  // Actions should re-execute on every click; only cache non-action scripts
  if (entry.type !== 'action' && _setupPromises.has(entry.id))
    return _setupPromises.get(entry.id)!
  const promise = _executeSetupScript(entry, context)
  if (entry.type !== 'action')
    _setupPromises.set(entry.id, promise)
  return promise
}
