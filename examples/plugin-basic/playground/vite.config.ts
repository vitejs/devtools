import { DevTools } from '@vitejs/devtools'
import { defineConfig } from 'vite'
import kitPluginBasic from '../src/node'

export default defineConfig({
  plugins: [
    DevTools({
      builtinDevTools: false,
    }),
    kitPluginBasic(),
  ],
})
