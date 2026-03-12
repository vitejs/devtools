/* @refresh reload */
import { render } from 'solid-js/web'
import App from './App'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

const root = document.getElementById('app')
if (!root)
  throw new Error('Missing #app root')

render(() => <App />, root)
