import fs from 'node:fs'
import { createSharedState } from '@vitejs/devtools-kit/utils/shared-state'
import { dirname } from 'pathe'
import { debounce } from 'perfect-debounce'

export interface CreateStorageOptions<T extends object> {
  filepath: string
  initialValue: T
  mergeInitialValue?: false | ((initialValue: T, savedValue: T) => T)
  debounce?: number
}

export function createStorage<T extends object>(options: CreateStorageOptions<T>) {
  const {
    mergeInitialValue = (initialValue, savedValue) => ({ ...initialValue, ...savedValue }),
    debounce: debounceTime = 100,
  } = options

  let initialValue: T
  if (fs.existsSync(options.filepath)) {
    const savedValue = JSON.parse(fs.readFileSync(options.filepath, 'utf-8')) as T
    initialValue = mergeInitialValue ? mergeInitialValue(options.initialValue, savedValue) : savedValue
  }
  else {
    initialValue = options.initialValue
  }

  const state = createSharedState<T>({
    initialValue,
    enablePatches: false,
  })

  // throttle the write to the file
  state.on(
    'updated',
    debounce((newState) => {
      fs.mkdirSync(dirname(options.filepath), { recursive: true })
      fs.writeFileSync(options.filepath, `${JSON.stringify(newState, null, 2)}\n`)
    }, debounceTime),
  )

  return state
}
