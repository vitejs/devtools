import { pipeline } from 'node:stream/promises'
import split2 from 'split2'
import { logger } from '../diagnostics'

export class JsonParseStreamError extends Error {
  constructor(
    message: string,
    public data: any,
  ) {
    super(message)
  }
}

export async function parseJsonStream<T>(
  stream: NodeJS.ReadableStream,
  processor?: (value: T) => void | Promise<void>,
): Promise<void> {
  let lineNumber = 0

  await pipeline(
    stream,
    split2(),
    async (source: AsyncIterable<string>) => {
      for await (const line of source) {
        lineNumber += 1

        if (!line) {
          continue
        }

        try {
          const parsed = JSON.parse(line) as T
          await processor?.(parsed)
        }
        catch (e) {
          const preview = line.length > 256 ? `${line.slice(0, 256)}...` : line
          logger.RDDT0002({ line: lineNumber, error: (e as Error).message, preview }).log()
        }
      }
    },
  )
}
