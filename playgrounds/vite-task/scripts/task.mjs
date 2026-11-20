import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { setTimeout } from 'node:timers/promises'

const task = process.argv[2]
const pkg = JSON.parse(await readFile('package.json', 'utf8'))
const name = pkg.name.split('/').at(-1)
await setTimeout(60 + name.length * 10)

if (task === 'clean') {
  await rm('dist', { recursive: true, force: true })
}
else if (task === 'build' || task === 'bundle') {
  const source = await readFile('src/index.ts', 'utf8')
  const dependencies = await Promise.all(Object.keys(pkg.dependencies || {}).map(async (id) => {
    const dep = id.split('/').at(-1)
    return readFile(`../${dep}/dist/${dep === 'types' ? 'index.d.ts' : 'index.js'}`, 'utf8')
  }))
  const external = name === 'core' ? await readFile('../../inputs/theme.json', 'utf8') : ''
  const mode = name === 'shared' ? process.env.VITE_TASK_MODE || 'default' : ''
  await mkdir('dist', { recursive: true })
  if (name === 'types') {
    await writeFile('dist/index.d.ts', source)
  }
  else {
    const { transformWithOxc } = await import('vite')
    const { code } = await transformWithOxc(source, 'src/index.ts')
    const inputs = JSON.stringify({ dependencies, external, mode })
    await writeFile(task === 'bundle' ? 'dist/bundle.js' : 'dist/index.js', `${code}\nexport const buildInputs = ${inputs}\n`)
    if (name === 'app' || name === 'docs')
      await writeFile('dist/index.html', `<!doctype html><title>${name}</title><script type="module" src="./index.js"></script>\n`)
  }
}
else if (task === 'test' || task === 'typecheck') {
  await readFile(name === 'types' ? 'dist/index.d.ts' : 'dist/index.js', 'utf8')
  await mkdir('dist/results', { recursive: true })
  await writeFile(`dist/results/${task}.json`, JSON.stringify({ task, passed: true }))
}
else {
  // Lint and lifecycle hooks simulate work without mutating build outputs.
  await readFile('src/index.ts', 'utf8')
}
