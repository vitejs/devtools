import type { ClientScriptEntry, DevToolsNodeUtils } from '@vitejs/devtools-kit'
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'
import { toDataURL } from 'mlly'

export const ContextUtils: DevToolsNodeUtils = {
  createSimpleClientScript(fn: string | ((ctx: DockClientScriptContext) => void)): ClientScriptEntry {
    const code = `const fn = ${fn.toString()}; export default fn`
    return {
      importFrom: toDataURL(code),
      importName: 'default',
    }
  },
}
