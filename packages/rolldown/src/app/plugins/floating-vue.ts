import { installFloatingVue } from '@vitejs/devtools-ui/plugins/floating-vue'
import { defineNuxtPlugin } from '#app/nuxt'

export default defineNuxtPlugin((nuxtApp) => {
  installFloatingVue(nuxtApp.vueApp)
})
