// @unocss-include

// Get the file extension
export function getFileExt(filename: string) {
  const ext = filename.split('.').pop()
  return ext ? `.${ext}` : ''
}

// Compute the height of the error markers
export function calculateErrorHeight(messages: any[]) {
  if (!messages || messages.length === 0) {
    return 0
  }

  // Find the maximum number of labels across all messages
  const maxLabels = Math.max(...messages.map(msg => msg.labels?.length || 0))

  // Each label needs roughly 2 lines of height (one for the indicator, one for the message),
  // each line is about 20px tall, plus some spacing.
  return maxLabels > 0 ? maxLabels * 3 * 20 + 15 : 0
}

// Process v-html input, replacing quoted content with a background-highlighted span
export function processLabelHtml(text: string) {
  if (!text) {
    return ''
  }

  // Match content between single/back quotes and replace it with a background-highlighted span
  return text.replace(
    /['`]([^'`]+)['`]/g,
    '<span class="bg-active px-1 py-0.5 rounded font-semibold">$1</span>',
  )
}
