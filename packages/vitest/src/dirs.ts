import { fileURLToPath } from 'node:url'

// Static assets (the dock favicon) ship in the package's `public/` dir, a
// sibling of `dist/`. `import.meta.url` resolves to `dist/dirs.mjs` once built,
// so `../public` points at the published `public/` directory.
export const clientPublicDir: string = fileURLToPath(new URL('../public', import.meta.url))
