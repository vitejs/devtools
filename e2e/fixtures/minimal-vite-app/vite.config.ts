import { DevTools } from '@vitejs/devtools'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    DevTools({
      builtinDevTools: false,
      build: {
        withApp: true,
      },
    }),
  ],
})
