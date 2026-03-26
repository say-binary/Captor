const { app, globalShortcut, systemPreferences, dialog, shell } = require('electron')
const net = require('net')
const windows = require('./windows')
const ipcHandlers = require('./ipc-handlers')

// Suppress macOS audio capture warning (safe on all platforms)
app.commandLine.appendSwitch('disable-features', 'MacCatapLoopbackAudioForScreenShare')

// ── TCP server for Chrome extension native host ────────────
const NATIVE_HOST_PORT = 34523

function startNativeHostServer() {
  const server = net.createServer((socket) => {
    let buf = ''
    socket.on('data', (chunk) => {
      buf += chunk.toString()
      const lines = buf.split('\n')
      buf = lines.pop() // keep incomplete last line
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const msg = JSON.parse(line)
          if (msg.type === 'SAVE_HIGHLIGHT') {
            const data = {
              type: 'text-highlight',
              highlightedText: msg.highlightedText || '',
              sourceUrl: msg.sourceUrl || '',
              sourceTitle: msg.sourceTitle || '',
            }
            windows.showAnnotation(data)
            socket.write(JSON.stringify({ ok: true }) + '\n')
          }
        } catch (e) {
          console.error('Native host parse error:', e)
        }
      }
    })
    socket.on('error', () => {})
  })

  server.listen(NATIVE_HOST_PORT, '127.0.0.1', () => {
    console.log(`Captor native host server listening on port ${NATIVE_HOST_PORT}`)
  })

  server.on('error', (err) => {
    console.error('Native host server error:', err)
  })
}

app.whenReady().then(async () => {
  // Create all windows first so the app is immediately usable
  windows.createGalleryWindow()
  windows.createFloatingButtonWindow()
  windows.createOverlayWindow()
  windows.createAnnotationWindow()

  ipcHandlers.register()
  startNativeHostServer()

  const registered = globalShortcut.register('CommandOrControl+Shift+H', () => {
    windows.triggerCapture()
  })

  if (!registered) {
    console.warn('Global shortcut CommandOrControl+Shift+H could not be registered — another app may own it.')
  }

  // Text highlight hotkey — Cmd+Shift+S
  // Triggers Cmd+C in the previously focused app (via AppleScript), then reads
  // the clipboard. Works in Chrome, Word, Pages, Preview, Safari, PDFs, etc.
  // No need to copy first — just select text and press Cmd+Shift+S.
  const { clipboard, nativeTheme } = require('electron')
  const { execFile } = require('child_process')

  const clipRegistered = globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (process.platform === 'darwin') {
      const prevClipboard = clipboard.readText()
      const helperPath = require('path').join(__dirname, '../../helpers/copy_selection')

      // Use compiled Swift helper that posts CGEvent at HID level —
      // requires NO Accessibility permission, works in any app.
      execFile(helperPath, [], (err) => {
        if (err) {
          console.error('copy_selection helper error:', err.message)
          return
        }
        setTimeout(() => {
          const text = clipboard.readText().trim()
          if (!text || text === prevClipboard.trim()) return
          windows.showAnnotation({
            type: 'text-highlight',
            highlightedText: text,
            sourceUrl: '',
            sourceTitle: '',
          })
        }, 200)
      })
    } else {
      const text = clipboard.readText().trim()
      if (!text) return
      windows.showAnnotation({
        type: 'text-highlight',
        highlightedText: text,
        sourceUrl: '',
        sourceTitle: '',
      })
    }
  })

  if (!clipRegistered) {
    console.warn('Global shortcut CommandOrControl+Shift+S could not be registered.')
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
