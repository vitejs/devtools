import type { DevToolsNodeContext, DevToolsViewHost as DevToolsViewHostType } from 'takubox/types'
import { existsSync } from 'node:fs'
import { logger } from './diagnostics'

export class DevToolsViewHost implements DevToolsViewHostType {
  /**
   * @internal
   */
  public buildStaticDirs: { baseUrl: string, distDir: string }[] = []

  constructor(
    public readonly context: DevToolsNodeContext,
  ) {
  }

  hostStatic(baseUrl: string, distDir: string) {
    if (!existsSync(distDir)) {
      throw logger.TKB0008({ distDir }).throw()
    }

    this.buildStaticDirs.push({ baseUrl, distDir })
    this.context.host.mountStatic(baseUrl, distDir)
  }
}
