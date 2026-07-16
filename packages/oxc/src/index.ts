import { argv } from 'node:process'
import cac from 'cac'
import { createDevServer } from 'devframe/adapters/dev'
import { version } from '../package.json'
import { oxcDevframe, OXC_DEVTOOLS_BASE } from './node/devframe'

const cli = cac('oxc-devtools')

cli.command('', 'Start Oxc DevTools').action(async () => {
  await createDevServer(oxcDevframe, {
    onReady: ({ origin }) => {
      console.log(`Oxc Inspector UI is running on ${origin}${OXC_DEVTOOLS_BASE}`)
    },
  })
})

cli.version(version)
cli.help()
cli.parse(argv)
