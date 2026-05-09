import type { SessionMeta } from '@rolldown/debug'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { join } from 'pathe'
import { RolldownEventsReader } from './events-reader'

export interface BuildInfo {
  id: string
  timestamp: number
  meta: SessionMeta
}

export class RolldownLogsManager {
  constructor(
    readonly dir: string,
  ) {
  }

  async list() {
    if (!existsSync(this.dir)) {
      return []
    }
    const sessions = await fs.readdir(this.dir, {
      withFileTypes: true,
    })
    return await Promise.all(sessions
      .filter(d => d.isDirectory())
      .filter(d => existsSync(join(this.dir, d.name, 'meta.json')))
      .map(async (d): Promise<BuildInfo> => {
        const reader = RolldownEventsReader.get(join(this.dir, d.name, 'meta.json'))
        await reader.read()
        const meta = reader.meta!
        return {
          id: d.name,
          // @ts-expect-error missing type
          timestamp: meta.timestamp,
          meta,
        }
      }),
    )
  }

  async loadSession(session: string) {
    const reader = RolldownEventsReader.get(join(this.dir, session, 'logs.json'))
    await reader.read()
    if (!reader.meta) {
      const metaReader = RolldownEventsReader.get(join(this.dir, session, 'meta.json'))
      await metaReader.read()
      reader.meta = metaReader.meta!
    }
    return reader
  }

  async loadAssetSession(session: string) {
    const reader = await this.loadSession(session)
    await reader.readAssets()
    return reader
  }

  async loadPackageSession(session: string) {
    const filepath = join(this.dir, session, 'logs.json')
    const reader = RolldownEventsReader.get(filepath, `${filepath}:package-summary`)
    await reader.readPackageSummary()
    if (!reader.meta) {
      const metaReader = RolldownEventsReader.get(join(this.dir, session, 'meta.json'))
      await metaReader.read()
      reader.meta = metaReader.meta!
    }
    return reader
  }
}
