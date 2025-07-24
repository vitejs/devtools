export function getContentByteSize(content: string) {
  if (!content)
    return 0
  return new TextEncoder().encode(content).length
}
