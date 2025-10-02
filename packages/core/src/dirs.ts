import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const dirDist: string = fileURLToPath(new URL('../dist', import.meta.url))
export const dirClientStandalone: string = join(dirDist, 'client/standalone')
