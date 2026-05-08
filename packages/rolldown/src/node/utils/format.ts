import { Buffer } from 'node:buffer'

export function getContentByteSize(content: string) {
  if (!content)
    return 0
  return Buffer.byteLength(content)
}
