import { argv } from 'node:process'
import { createCac } from 'devframe/adapters/cac'
import { version } from '../package.json'
import { oxcDevframe, OXC_DEVTOOLS_BASE } from './node/devframe'

const cli = createCac(oxcDevframe, {
  onReady: ({ origin }) => {
    console.log(`Oxc Devtools UI is running on ${origin}${OXC_DEVTOOLS_BASE}`)
  },
})

cli.cli.version(version)
await cli.parse(argv)
