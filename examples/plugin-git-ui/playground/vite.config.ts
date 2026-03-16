import { DevTools } from '@vitejs/devtools'
import { defineConfig } from 'vite'
import { GitUIPlugin } from '../src/node'

export default defineConfig({
  plugins: [
    DevTools({
      builtinDevTools: false,
    }),
    GitUIPlugin(),
  ],
  build: {
    rollupOptions: {
      devtools: {},
    },
  },
})
