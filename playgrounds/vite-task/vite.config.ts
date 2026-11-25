import { DevTools } from '@vitejs/devtools'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  plugins: [DevTools()],
  run: {
    tasks: {
      build: {
        command: 'node -e "console.log(\'workspace build complete\')"',
        dependsOn: ['@vite-task-playground/app#build', '@vite-task-playground/docs#build', '@vite-task-playground/config#build'],
        cache: false,
      },
    },
  },
})
