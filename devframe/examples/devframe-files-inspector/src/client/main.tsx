import { render } from 'preact'
import { App } from './app'

const root = document.getElementById('app')
if (!root)
  throw new Error('#app mount node missing from index.html')
render(<App />, root)
