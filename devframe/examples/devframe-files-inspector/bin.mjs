#!/usr/bin/env node
import process from 'node:process'
import { createCli } from 'devframe/adapters/cli'
import devframe from './src/devframe.ts'

async function main() {
  const cli = createCli(devframe)
  await cli.parse()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
