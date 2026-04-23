#!/usr/bin/env node
import process from 'node:process'
import { createCli } from 'devframe/cli'
import devtool from './src/devtool.ts'

async function main() {
  const cli = createCli(devtool)
  await cli.parse()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
