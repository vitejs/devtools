function setupDevToolsPanel() {
  chrome.devtools.panels.create(
    'Vite',
    'icons/128.png',
    'dist/app/panel/devtools-panel.html',
    (panel) => {
      panel.onShown.addListener(() => {
      })
      panel.onHidden.addListener(() => {
      })
    },
  )
}

// @TODO: detect vite env
setupDevToolsPanel()
