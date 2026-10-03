const ACTIVE_ICONS = {
  16: '/icons/16.png',
  48: '/icons/48.png',
  128: '/icons/128.png',
}

const INACTIVE_ICONS = {
  16: '/icons/16-inactive.png',
  48: '/icons/48-inactive.png',
  128: '/icons/128-inactive.png',
}

export async function setActionIcon(tabId: number, active: boolean): Promise<void> {
  try {
    await chrome.action.setIcon({
      tabId,
      path: active ? ACTIVE_ICONS : INACTIVE_ICONS,
    })
  }
  catch {
    // Ignore expected tab-close races.
  }
}
