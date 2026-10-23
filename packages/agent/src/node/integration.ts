import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { isPackageExists } from 'local-pkg'
import { diagnostics } from './diagnostics'

export function isInstalled(context: ViteDevToolsNodeContext, pkg: string) {
  return isPackageExists(pkg, { paths: [context.cwd] })
}

export function assertInstalled(context: ViteDevToolsNodeContext, pkg: string) {
  if (!isInstalled(context, pkg))
    throw diagnostics.AGDT0003({ pkg })
}

export function missingPackageHint(pkg: string) {
  return `${pkg} is not installed in this project. Install it as a dev dependency and restart the dev server.`
}
