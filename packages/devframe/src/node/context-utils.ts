import type { ClientScriptEntry } from 'devframe/types'
import { toDataURL } from 'mlly'

export const ContextUtils = {
  createSimpleClientScript(fn: string | ((ctx: any) => void)): ClientScriptEntry {
    const code = `const fn = ${fn.toString()}; export default fn`
    return {
      importFrom: toDataURL(code),
      importName: 'default',
    }
  },
}
