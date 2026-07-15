import { argv } from 'node:process'
import { cli } from 'gunshi'
import { mainCommand } from './commands/main'
import { lint } from './commands/lint'
import { version } from '../package.json'

cli(argv.slice(2), mainCommand, {
  name: 'oxc-devtools',
  version,
  renderHeader: () => Promise.resolve(''),
  subCommands: {
    lint,
  },
})
