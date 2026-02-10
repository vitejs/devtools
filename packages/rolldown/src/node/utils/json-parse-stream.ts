import { pipeline } from 'node:stream/promises'
import split2 from 'split2'
import StreamJSON from 'stream-json'
import Assembler from 'stream-json/Assembler'

export class JsonParseStreamError extends Error {
  constructor(
    message: string,
    public data: any,
  ) {
    super(message)
  }
}

export function parseJsonStream<T>(
  stream: NodeJS.ReadableStream,
): Promise<T> {
  const assembler = new Assembler()
  const parser = StreamJSON.parser()

  return new Promise<T>((resolve) => {
    parser.on('data', (chunk) => {
      (assembler as any)[chunk.name]?.(chunk.value)
    })
    stream.pipe(parser)
    parser.on('end', () => {
      resolve(assembler.current)
    })
  })
}

export async function parseJsonStreamWithConcatArrays<T, K = T>(
  stream: NodeJS.ReadableStream,
  processor?: (value: T) => K,
): Promise<K[]> {
  const values: K[] = []

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
          const result = processor ? processor(parsed) : (parsed as unknown as K)
          values.push(result)
        }
        catch (e) {
          const preview = line.length > 256 ? `${line.slice(0, 256)}...` : line
          console.warn(
            `[rolldown-devtools] JSON parse stream skip bad line ${lineNumber}: ${(e as Error).message}\n${preview}`,
          )
        }
      }
    },
  )

  return values
}
