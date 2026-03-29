import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'app/scripts/*.ts',
  ],
  clean: true,
})
