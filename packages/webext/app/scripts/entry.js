(async () => {
  // eslint-disable-next-line no-undef
  const script = chrome.runtime.getURL('dist/content-scripts.mjs')
  console.log('scripts', script)
  await import(script)
})()
