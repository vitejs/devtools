import { readFile } from 'node:fs/promises'
import { cwd } from 'node:process'
import { resolve } from 'pathe'

export async function getOxfmtConfig(root = cwd()) {
  const configPath = resolve(root, 'oxfmt.config.ts')
  try {
    const config = await readFile(configPath, 'utf-8')
    return config
  } catch {
    return null
  }
}
