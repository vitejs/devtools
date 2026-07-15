import { fileURLToPath } from 'node:url'

export const clientPublicDir: string = fileURLToPath(
  new URL('../dist/client/public', import.meta.url),
)
