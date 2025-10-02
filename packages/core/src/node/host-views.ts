import type { DevToolsNodeContext, DevToolsViewHost as DevToolsViewHostType } from '@vitejs/devtools-kit'
import { existsSync } from 'node:fs'
import sirv from 'sirv'

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
      throw new Error(`[Vite DevTools] distDir ${distDir} does not exist`)
    }

    if (this.context.viteConfig.command === 'serve') {
      if (!this.context.viteServer)
        throw new Error('[Vite DevTools] viteServer is required in dev mode')
      this.context.viteServer.middlewares.use(
        baseUrl,
        sirv(distDir, {
          dev: true,
          single: true,
        }),
      )
    }
    else {
      this.buildStaticDirs.push({ baseUrl, distDir })
    }
  }
}
