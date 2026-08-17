import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import archiver from 'archiver'

type ManifestFileCollection = string[] | Record<string, string>

interface ExtensionManifest {
  devtools_page?: string
  background?: { service_worker?: string }
  action?: { default_icon?: ManifestFileCollection, default_popup?: string }
  icons?: ManifestFileCollection
  content_scripts?: Array<{ js?: string[], css?: string[] }>
}

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rootDir = path.resolve(packageDir, '../..')
const outDir = path.join(rootDir, 'dist')
const outFile = path.join(outDir, 'vite-devtools-chrome.zip')
const include = [
  'app/background/**',
  'dist/**',
  'icons/**',
  'manifest.json',
  'package.json',
]
const ignore = [
  '**/.DS_Store',
  '**/node_modules/**',
  '**/*.d.cts',
  '**/*.d.mts',
  '**/*.d.ts',
  '**/*.map',
  '**/*.tsbuildinfo',
]

const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'manifest.json'), 'utf8')) as ExtensionManifest
const requiredFiles = collectManifestFiles(manifest)

fs.rmSync(outFile, { force: true })
fs.mkdirSync(outDir, { recursive: true })

const output = fs.createWriteStream(outFile)
const archive = archiver('zip', { zlib: { level: 9 } })
const entries = new Set<string>()

const done = new Promise<void>((resolve, reject) => {
  output.on('close', resolve)
  output.on('error', reject)
  archive.on('entry', entry => entries.add(entry.name))
  archive.on('error', reject)
  archive.on('warning', (error) => {
    if (error.code === 'ENOENT')
      return
    reject(error)
  })
})

archive.pipe(output)
for (const pattern of include) {
  archive.glob(pattern, {
    cwd: packageDir,
    ignore,
  })
}

await archive.finalize()
await done

const size = archive.pointer()
if (size < 1000)
  throw new Error(`Zip file is unexpectedly small: ${size} bytes`)

for (const file of requiredFiles) {
  if (!entries.has(file))
    throw new Error(`Manifest file is missing from zip: ${file}`)
}

console.log(`Created ${path.relative(rootDir, outFile)} (${formatBytes(size)}, ${entries.size} files)`)

function collectManifestFiles(manifest: ExtensionManifest): Set<string> {
  const files = new Set(['manifest.json'])

  add(files, manifest.devtools_page)
  add(files, manifest.background?.service_worker)
  add(files, manifest.action?.default_popup)
  addAll(files, manifest.action?.default_icon)
  addAll(files, manifest.icons)

  for (const contentScript of manifest.content_scripts ?? []) {
    addAll(files, contentScript.js)
    addAll(files, contentScript.css)
  }

  return files
}

function add(files: Set<string>, value: string | undefined): void {
  if (typeof value === 'string')
    files.add(value)
}

function addAll(files: Set<string>, value: ManifestFileCollection | undefined): void {
  if (Array.isArray(value)) {
    for (const entry of value)
      add(files, entry)
    return
  }

  if (value && typeof value === 'object') {
    for (const entry of Object.values(value))
      add(files, entry)
  }
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${size.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`
}
