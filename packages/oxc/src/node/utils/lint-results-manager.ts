import type { LintResultLogs, LintResultMeta } from '../../types'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { diagnostics } from '../diagnostics'

export class LintResultsManager {
  constructor(readonly dir: string) {}

  async list(): Promise<LintResultMeta[]> {
    if (!existsSync(this.dir)) return []

    const entries = await readdir(this.dir, { withFileTypes: true })
    const results = await Promise.all(
      entries
        .filter(entry => entry.isDirectory() && /^\d+$/.test(entry.name))
        .sort((a, b) => Number(b.name) - Number(a.name))
        .map(async entry => {
          try {
            return JSON.parse(
              await readFile(join(this.dir, entry.name, 'meta.json'), 'utf-8'),
            ) as LintResultMeta
          } catch {
            return null
          }
        }),
    )
    return results.filter(result => result !== null)
  }

  async load(resultId: string): Promise<{ meta: LintResultMeta; logs: LintResultLogs } | null> {
    this.validateId(resultId)
    try {
      const [meta, logs] = await Promise.all([
        readFile(join(this.dir, resultId, 'meta.json'), 'utf-8'),
        readFile(join(this.dir, resultId, 'logs.json'), 'utf-8'),
      ])
      return { meta: JSON.parse(meta), logs: JSON.parse(logs) }
    } catch {
      return null
    }
  }

  async create(meta: LintResultMeta, logs: LintResultLogs) {
    const resultDir = join(this.dir, String(meta.timestamp))
    await mkdir(resultDir, { recursive: true })
    await Promise.all([
      writeFile(join(resultDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8'),
      writeFile(join(resultDir, 'logs.json'), JSON.stringify(logs, null, 2), 'utf-8'),
    ])
    return meta.timestamp
  }

  async delete(resultId: string) {
    this.validateId(resultId)
    await rm(join(this.dir, resultId), { recursive: true })
  }

  private validateId(resultId: string) {
    if (!/^\d+$/.test(resultId)) throw diagnostics.OXDT0002({ resultId })
  }
}
