import type { DevToolsNodeContext, DevToolsViewHost as DevToolsViewHostType } from '@vitejs/devtools-kit'
import { existsSync } from 'node:fs'
import sirv from 'sirv'
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
      throw logger.DTK0022({ distDir }).throw()
    }

    this.buildStaticDirs.push({ baseUrl, distDir })

    if (this.context.viteConfig.command === 'serve') {
      if (!this.context.viteServer)
        throw logger.DTK0023().throw()
      this.context.viteServer.middlewares.use(
        baseUrl,
        sirv(distDir, {
          dev: true,
          single: true,
        }),
      )
    }
  }
}
