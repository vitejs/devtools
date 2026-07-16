import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { cwd } from 'node:process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'pathe'

export async function getOxlintConfig() {
  // Read the .oxlintrc.json file in the current directory
  const configPath = resolve(cwd(), '.oxlintrc.json')
  try {
    const config = await readFile(configPath, 'utf-8')

    return config
  } catch {
    return null
  }
}

export const clientDir = resolve(dirname(fileURLToPath(import.meta.url)), './client/public')
