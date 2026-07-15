// Get the file extension
export function getFileExt(filename: string) {
  const ext = filename.split('.').pop()
  return ext ? `.${ext}` : ''
}

// Get the file icon
export function getFileIcon(filename: string) {
  const ext = getFileExt(filename)
  switch (ext) {
    case '.ts':
    case '.tsx':
    case '.mts':
    case '.cts':
      return 'vscode-icons:file-type-typescript'
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'vscode-icons:file-type-js'
    case '.vue':
      return 'vscode-icons:file-type-vue'
    case '.css':
      return 'vscode-icons:file-type-css'
    case '.json':
      return 'vscode-icons:file-type-json'
    case '.md':
      return 'vscode-icons:file-type-markdown'
    case '.svelte':
      return 'vscode-icons:file-type-svelte'
    case '.astro':
      return 'vscode-icons:file-type-astro'
    default:
      return 'vscode-icons:file-type-text'
  }
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
    '<span class="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded font-semibold">$1</span>',
  )
}
