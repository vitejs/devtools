function setupDevToolsPanel() {
  chrome.devtools.panels.create(
    'Vite',
    'icons/128.png',
    'app/pages/panel.html',
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
