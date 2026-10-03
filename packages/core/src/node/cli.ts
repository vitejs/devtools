import process from 'node:process'
import cac from 'cac'

const cli = cac('vite-devtools')

process.on('SIGINT', () => {
  process.exit(0)
})

cli
  .command('build', 'Build devtools with current config file for static hosting')
  .option('--root <root>', 'Root directory', { default: process.cwd() })
  .option('--config <config>', 'Vite config file')
  // Build specific options
  .option('--base <baseURL>', 'Base URL for deployment', { default: '/' })
  .option('--outDir <dir>', 'Output directory', { default: '.vite-devtools' })
  // Action
  .action(async (options) => {
    const { build } = await import('./cli-commands')
    await build(options)
    // A static build has no long-lived work left once it returns. Exiting
    // explicitly makes termination independent of whatever a `devtools.setup()`
    // hook (ours or a third-party plugin's) may have left open — a stray timer,
    // socket, or watcher would otherwise hang the process indefinitely instead
    // of a build that should just finish and exit.
    process.exit(0)
  })

cli
  .command('', 'Start devtools')
  .option('--root <root>', 'Root directory', { default: process.cwd() })
  .option('--config <config>', 'Vite config file')
  // Dev specific options
  .option('--host <host>', 'Host', { default: process.env.HOST || '127.0.0.1' })
  .option('--port <port>', 'Port', { default: process.env.PORT || 9999 })
  .option('--open', 'Open browser', { default: true })
  // Action
  .action(async (options) => {
    const { start } = await import('./cli-commands')
    return await start(options)
  })

cli.help()
cli.parse()
