import fs from 'node:fs'
import { createSharedState } from '@vitejs/devtools-kit/utils/shared-state'

export interface CreateStorageOptions<T extends object> {
  filepath: string
  initialValue: T
}

export async function createStorage<T extends object>(options: CreateStorageOptions<T>) {
  let initialState: T
  if (fs.existsSync(options.filepath)) {
    initialState = JSON.parse(await fs.readFileSync(options.filepath, 'utf-8')) as T
  }
  else {
    initialState = options.initialValue
  }

  const state = createSharedState<T>({
    initialState,
    enablePatches: false,
  })

  state.on('updated', (newState) => {
    fs.writeFileSync(options.filepath, `${JSON.stringify(newState, null, 2)}\n`)
  })

  return state
}
