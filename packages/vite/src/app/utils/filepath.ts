/* eslint-disable unimport/auto-insert */
import { relative } from 'pathe'
import { getModuleNameFromPath, isPackageName } from '../../shared/utils/filepath'
import { makeCachedFunction } from './cache'

function getModuleSubpathFromPath(path: string) {
  const match = path.match(/.*\/node_modules\/(.*)$/)?.[1]
  if (!match)
    return undefined
  return match
}

export function isBuiltInModule(name: string | undefined) {
  if (!name)
    return
  return ['nuxt', '#app', '#head', 'vue'].includes(name)
}

export const parseReadablePath = makeCachedFunction((path: string, root: string) => {
  const parsedPath = path
    .replace(/%2F/g, '/')
    .replace(/\\/g, '/')
  if (isPackageName(parsedPath)) {
    return {
      moduleName: parsedPath,
      path: parsedPath,
    }
  }

  if (parsedPath.match(/^\w+:/)
    && !(path.match(/^[a-z]:\\/i)) // in order to check if it is Windows' path
  ) {
    return {
      moduleName: parsedPath,
      path: parsedPath,
    }
  }

  const moduleName = getModuleNameFromPath(parsedPath)
  const subpath = getModuleSubpathFromPath(parsedPath)
  if (moduleName && subpath) {
    return {
      moduleName,
      path: subpath,
    }
  }
  // Workaround https://github.com/unjs/pathe/issues/113
  try {
    let result = relative(root, parsedPath)
    if (!result.startsWith('./') && !result.startsWith('../'))
      result = `./${result}`
    if (result.startsWith('./.nuxt/'))
      result = `#build${result.slice(7)}`
    return { path: result }
  }
  catch {
    return { path: parsedPath }
  }
})
