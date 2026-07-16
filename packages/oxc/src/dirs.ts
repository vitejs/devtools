import { fileURLToPath } from 'node:url'

export const clientPublicDir: string = fileURLToPath(new URL('../dist/public', import.meta.url))
