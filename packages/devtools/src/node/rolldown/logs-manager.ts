import type { SessionMeta } from '@rolldown/debug'
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
    const sessions = await fs.readdir(this.dir, {
      withFileTypes: true,
    })
    return await Promise.all(sessions
      .filter(d => d.isDirectory())
      .map(async (d): Promise<BuildInfo> => {
        const reader = RolldownEventsReader.get(join(this.dir, d.name, 'meta.json'))
        await reader.read()
        const meta = reader.manager.events[reader.manager.events.length - 1] as SessionMeta
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
    const metaReader = RolldownEventsReader.get(join(this.dir, session, 'meta.json'))
    reader.meta = metaReader.manager.events[metaReader.manager.events.length - 1] as SessionMeta
    await reader.read()
    return reader
  }
}
