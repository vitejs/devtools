import type { App } from 'vue'
import FloatingVue from 'floating-vue'

export function installFloatingVue(app: App): void {
  app.use(FloatingVue, {
    overflowPadding: 20,
  })
}
