const { app, globalShortcut, systemPreferences, dialog, shell } = require('electron')
const windows = require('./windows')
const ipcHandlers = require('./ipc-handlers')

// Suppress macOS audio capture warning (safe on all platforms)
app.commandLine.appendSwitch('disable-features', 'MacCatapLoopbackAudioForScreenShare')

app.whenReady().then(async () => {
  // Create all windows first so the app is immediately usable
  windows.createGalleryWindow()
  windows.createFloatingButtonWindow()
  windows.createOverlayWindow()
  windows.createAnnotationWindow()

  ipcHandlers.register()

  const registered = globalShortcut.register('CommandOrControl+Shift+H', () => {
    windows.triggerCapture()
  })

  if (!registered) {
    console.warn('Global shortcut CommandOrControl+Shift+H could not be registered — another app may own it.')
  }

  app.on('activate', () => {
    const gw = windows.getGalleryWin()
    if (!gw || gw.isDestroyed()) {
      windows.createGalleryWindow()
    } else {
      gw.show()
    }
  })

  // Check permissions after windows are ready (non-blocking)
  checkMacOSPermissions()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  // Keep app alive on macOS (menu bar); quit on Windows/Linux
  if (process.platform !== 'darwin') app.quit()
})

async function checkMacOSPermissions() {
  if (process.platform !== 'darwin') return

  // Do a real capture attempt — this both registers the app in System Settings
  // AND tells us definitively whether permission is granted (the status API
  // is unreliable for dev builds).
  const { desktopCapturer } = require('electron')
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1, height: 1 },
    })
    // If we get sources back, permission is granted — nothing to do
    if (sources && sources.length > 0) return
  } catch {
    // Fall through to show the dialog
  }

  // Permission not granted — show dialog (windows exist now so it will appear)
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    title: 'Screen Recording Permission Required',
    message:
      'Captor needs Screen Recording access to capture highlights.\n\n' +
      '1. Click "Open System Settings"\n' +
      '2. Find "Electron" in the list and toggle it ON\n' +
      '3. Quit and relaunch Captor',
    buttons: ['Open System Settings', 'Not Now'],
    defaultId: 0,
  })
  if (response === 0) {
    shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
    )
  }
}
