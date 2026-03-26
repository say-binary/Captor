const { ipcMain } = require('electron')
const windows = require('./windows')
const capture = require('./capture')
const storage = require('./storage')
const fs = require('fs')

function register() {
  // Floating button or hotkey triggers the overlay
  ipcMain.on('start-capture', () => {
    windows.showOverlay()
  })

  // Overlay sends final selection rectangle
  ipcMain.handle('selection-complete', async (event, rect) => {
    windows.hideOverlay()
    try {
      const result = await capture.takeScreenshot(rect)
      windows.showAnnotation(result)
      return { ok: true }
    } catch (err) {
      console.error('Screenshot failed:', err)
      return { ok: false, error: err.message }
    }
  })

  // Cancel overlay (Esc)
  ipcMain.on('cancel-capture', () => {
    windows.hideOverlay()
  })

  // Annotation form submits note + tags
  ipcMain.handle('save-highlight', (event, { id, filePath, timestamp, width, height, note, tags }) => {
    const entry = { id, filePath, timestamp, width, height, note, tags }
    storage.appendEntry(entry)
    windows.hideAnnotation()
    windows.refreshGallery(entry)
    return { ok: true }
  })

  // Gallery requests full index
  ipcMain.handle('load-highlights', () => {
    return storage.loadIndex()
  })

  // Gallery requests a PNG as base64 dataURL
  ipcMain.handle('get-thumbnail-data', (event, filePath) => {
    return storage.getThumbnailData(filePath)
  })
}

module.exports = { register }
