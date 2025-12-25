import fs from 'node:fs'
import { createSharedState } from '@vitejs/devtools-kit/utils/shared-state'
import { dirname } from 'pathe'

export interface CreateStorageOptions<T extends object> {
  filepath: string
  initialValue: T
}

export function createStorage<T extends object>(options: CreateStorageOptions<T>) {
  let initialValue: T
  if (fs.existsSync(options.filepath)) {
    initialValue = JSON.parse(fs.readFileSync(options.filepath, 'utf-8')) as T
  }
  else {
    initialValue = options.initialValue
  }

  const state = createSharedState<T>({
    initialValue,
    enablePatches: false,
  })

  state.on('updated', (newState) => {
    fs.mkdirSync(dirname(options.filepath), { recursive: true })
    fs.writeFileSync(options.filepath, `${JSON.stringify(newState, null, 2)}\n`)
  })

  return state
}
