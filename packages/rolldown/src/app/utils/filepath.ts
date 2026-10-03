import { parseReadablePath as parseReadablePathImpl } from '@vitejs/devtools-ui/utils/filepath'
import { makeCachedFunction } from './cache'

export { getModuleNameFromPath, isBuiltInModule, isPackageName, normalizeModulePath } from '@vitejs/devtools-ui/utils/filepath'

export const parseReadablePath = makeCachedFunction(parseReadablePathImpl)
