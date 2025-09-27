import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const distDir: string = fileURLToPath(new URL('../dist', import.meta.url))
export const distPublicDir: string = join(distDir, 'public')
