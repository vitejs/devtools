import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import devtool from './devtool'

export default createPluginFromDevframe(devtool)
