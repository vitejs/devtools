const checkInfo = {
  viteDetected: false,
  checkCount: 0,
}
const checkViteInterval = window.setInterval(() => {
  if (checkInfo.viteDetected || checkInfo.checkCount > 10) {
    clearInterval(checkViteInterval)
    return
  }

  createDevToolsPanel()
  checkInfo.checkCount++
}, 1000)

function createDevToolsPanel() {
  // TODO (hold-off): detect vite env
  chrome.devtools.inspectedWindow.eval('true', (detected) => {
    if (!detected || checkInfo.viteDetected) {
      return
    }

    checkInfo.viteDetected = true
    clearInterval(checkViteInterval)

    chrome.devtools.panels.create('Vite', 'icons/128.png', 'pages/devtools-panel.html', (panel) => {
      panel.onShown.addListener(() => {
        // update devtools panel state here
      })
      panel.onHidden.addListener(() => {
        // update devtools panel state here
      })
    })
  })
}
