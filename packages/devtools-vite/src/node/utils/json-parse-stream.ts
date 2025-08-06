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
      // @ts-expect-error casting
      assembler[chunk.name]?.(chunk.value)
    })
    stream.pipe(parser)
    parser.on('end', () => {
      resolve(assembler.current)
    })
  })
}

export function parseJsonStreamWithConcatArrays<T, K = T>(
  stream: NodeJS.ReadableStream,
  processor?: (value: T) => K,
): Promise<K[]> {
  const assembler = new Assembler()
  const parser = StreamJSON.parser({
    jsonStreaming: true,
  })

  const values: K[] = []

  return new Promise<K[]>((resolve) => {
    parser.on('data', (chunk) => {
      // @ts-expect-error casting
      assembler[chunk.name]?.(chunk.value)
      if (assembler.done) {
        values.push(processor ? processor(assembler.current) : assembler.current)
      }
    })
    stream.pipe(parser)
    parser.on('end', () => {
      resolve(values)
    })
  })
}
