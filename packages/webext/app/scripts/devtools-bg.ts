const META_CHECK_INTERVAL = 1000
const META_CHECK_ATTEMPTS = 10
const META_CHECK_EVAL = 'Boolean(window.__VITE_DEVTOOLS_CONNECTION_META__)'
const PANEL_TITLE = 'Vite'
const PANEL_ICON = 'icons/128.png'
const PANEL_PAGE = 'dist/app/panel/devtools-panel.html'

let isPanelCreated = false
let checkId = 0

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function checkConnectionMeta(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval<boolean>(META_CHECK_EVAL, (result, exceptionInfo) => {
      resolve(!exceptionInfo && Boolean(result))
    })
  })
}

function createPanel() {
  if (isPanelCreated)
    return

  isPanelCreated = true
  chrome.devtools.panels.create(PANEL_TITLE, PANEL_ICON, PANEL_PAGE, () => {})
}

async function checkPanel() {
  if (isPanelCreated)
    return

  const currentCheckId = ++checkId

  for (let attempt = 0; attempt < META_CHECK_ATTEMPTS; attempt++) {
    if (await checkConnectionMeta()) {
      if (currentCheckId === checkId)
        createPanel()
      return
    }

    if (attempt < META_CHECK_ATTEMPTS - 1)
      await sleep(META_CHECK_INTERVAL)

    if (currentCheckId !== checkId)
      return
  }
}

chrome.devtools.network.onNavigated.addListener(() => {
  checkPanel()
})

checkPanel()
