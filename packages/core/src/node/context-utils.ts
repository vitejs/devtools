import type { DevToolsNodeUtils } from '@vitejs/devtools-kit'
import { toDataURL } from 'mlly'

export const ContextUtils: DevToolsNodeUtils = {
  clientEntryFromSimpleFunction: (fn: () => void) => {
    const code = `const fn = ${fn.toString()}; export default fn`
    return {
      importFrom: toDataURL(code),
      importName: 'default',
    }
  },
}
