import process from 'node:process'
import cac from 'cac'
import { build, start } from './commands'

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
  .action(build)

cli
  .command('', 'Start devtools')
  .option('--root <root>', 'Root directory', { default: process.cwd() })
  .option('--config <config>', 'Vite config file')
  // Dev specific options
  .option('--host <host>', 'Host', { default: process.env.HOST || '127.0.0.1' })
  .option('--port <port>', 'Port', { default: process.env.PORT || 9999 })
  .option('--open', 'Open browser', { default: true })
  // Action
  .action(start)

cli.help()
cli.parse()
