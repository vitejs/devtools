import { createApp, h, Suspense } from 'vue'
import App from './App.vue'

import '@unocss/reset/tailwind.css'
import './styles/main.css'
import '../webcomponents/style.css'
import 'uno.css'

const app = createApp({
  render: () => h(Suspense, {}, {
    default: () => h(App),
    fallback: () => h('div', 'Loading...'),
  }),
})

app.mount('#app')
