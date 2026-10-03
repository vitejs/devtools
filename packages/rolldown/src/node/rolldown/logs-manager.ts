import type { SessionMeta } from '@rolldown/debug'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { join } from 'pathe'
import { diagnostics } from '../diagnostics'
import { RolldownEventsReader } from './events-reader'

export interface BuildInfo {
  id: string
  timestamp: number
  meta: SessionMeta
  /** Optional user-defined alias, persisted alongside the sessions. */
  alias?: string
}

/** Reject ids that could escape the sessions directory. */
function assertValidSessionId(id: string): void {
  if (!id || id.includes('/') || id.includes('\\') || id.includes('..')) {
    throw diagnostics.RDDT0004({ id })
  }
}

export class RolldownLogsManager {
  constructor(
    readonly dir: string,
  ) {
  }

  /** Path of the sidecar file holding user-defined session aliases. */
  private get aliasesPath(): string {
    return join(this.dir, 'aliases.json')
  }

  async readAliases(): Promise<Record<string, string>> {
    if (!existsSync(this.aliasesPath)) {
      return {}
    }
    try {
      const parsed = JSON.parse(await fs.readFile(this.aliasesPath, 'utf-8'))
      return (parsed && typeof parsed === 'object') ? parsed : {}
    }
    catch {
      return {}
    }
  }

  private async writeAliases(aliases: Record<string, string>): Promise<void> {
    await fs.writeFile(this.aliasesPath, `${JSON.stringify(aliases, null, 2)}\n`, 'utf-8')
  }

  async list() {
    if (!existsSync(this.dir)) {
      return []
    }
    const [sessions, aliases] = await Promise.all([
      fs.readdir(this.dir, { withFileTypes: true }),
      this.readAliases(),
    ])
    const entries = await Promise.all(sessions
      .filter(d => d.isDirectory())
      .filter(d => existsSync(join(this.dir, d.name, 'meta.json')))
      .map(async (d): Promise<BuildInfo | undefined> => {
        const reader = RolldownEventsReader.get(join(this.dir, d.name, 'meta.json'))
        await reader.read()
        const meta = reader.meta
        if (!meta) {
          return
        }
        return {
          id: d.name,
          // @ts-expect-error missing type
          timestamp: meta.timestamp,
          meta,
          alias: aliases[d.name],
        }
      }),
    )
    return entries.filter((entry): entry is BuildInfo => !!entry)
  }

  /** Set or clear a user-defined alias for a session. */
  async renameSession(id: string, alias: string): Promise<string> {
    assertValidSessionId(id)
    const aliases = await this.readAliases()
    const trimmed = alias.trim()
    if (trimmed) {
      aliases[id] = trimmed
    }
    else {
      delete aliases[id]
    }
    await this.writeAliases(aliases)
    return trimmed
  }

  /** Remove a session's log directory from disk along with its alias. */
  async deleteSession(id: string): Promise<void> {
    assertValidSessionId(id)
    const target = join(this.dir, id)
    if (existsSync(target)) {
      await fs.rm(target, { recursive: true, force: true })
    }
    const aliases = await this.readAliases()
    if (id in aliases) {
      delete aliases[id]
      await this.writeAliases(aliases)
    }
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

  async loadSessionSummary(session: string) {
    const reader = RolldownEventsReader.get(join(this.dir, session, 'logs.json'))
    await reader.readSummary()
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
    const loadedReader = RolldownEventsReader.peek(filepath)
    if (loadedReader?.hasCompleteSession() || loadedReader?.isReadingCompleteSession()) {
      await loadedReader.read()
      await loadedReader.ensurePackageSummaryCache()
      if (!loadedReader.meta) {
        const metaReader = RolldownEventsReader.get(join(this.dir, session, 'meta.json'))
        await metaReader.read()
        loadedReader.meta = metaReader.meta!
      }
      return loadedReader
    }

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
