import { fileURLToPath } from 'node:url'
import { startStandaloneDevTools } from './standalone'

startStandaloneDevTools({
  cwd: fileURLToPath(new URL('../../../devtools-kit', import.meta.url)),
})
