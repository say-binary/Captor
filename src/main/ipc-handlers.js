const { ipcMain, dialog, shell } = require('electron')
const windows = require('./windows')
const capture = require('./capture')
const storage = require('./storage')

function register() {
  // ── Capture flow ──────────────────────────────────────
  ipcMain.on('start-capture', () => windows.showOverlay())

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

  ipcMain.on('cancel-capture', () => windows.hideOverlay())

  // ── Annotation flow ───────────────────────────────────
  ipcMain.on('cancel-annotation', () => windows.hideAnnotation())

  ipcMain.handle('save-highlight', (event, data) => {
    const { id, filePath, timestamp, width, height, note, tags, highlightedText, sourceUrl, type } = data
    const entry = {
      id,
      filePath: filePath || '',
      timestamp,
      width: width || 0,
      height: height || 0,
      note: note || '',
      tags: tags || [],
      highlightedText: highlightedText || '',
      sourceUrl: sourceUrl || '',
      type: type || 'screenshot',
    }
    storage.appendEntry(entry)
    windows.hideAnnotation()
    windows.refreshGallery(entry)
    return { ok: true }
  })

  // ── Gallery ───────────────────────────────────────────
  ipcMain.handle('load-highlights', () => storage.loadIndex())

  ipcMain.handle('get-thumbnail-data', (event, filePath) => storage.getThumbnailData(filePath))

  ipcMain.handle('update-highlight', (event, { id, fields }) => {
    const updated = storage.updateEntry(id, fields)
    if (updated) windows.broadcastHighlightUpdated(updated)
    return updated || { ok: false }
  })

  ipcMain.handle('delete-highlight', (event, id) => {
    const ok = storage.deleteEntry(id)
    if (ok) windows.broadcastHighlightDeleted(id)
    return { ok }
  })

  // ── Folder management ─────────────────────────────────
  ipcMain.handle('choose-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose folder for highlights',
    })
    if (canceled || !filePaths.length) return null
    const folderPath = filePaths[0]
    storage.setActiveFolder(folderPath)
    windows.broadcastFolderChanged(folderPath)
    return folderPath
  })

  ipcMain.handle('get-active-folder', () => storage.getActiveFolder())

  ipcMain.handle('set-active-folder', (event, folderPath) => {
    storage.setActiveFolder(folderPath)
    windows.broadcastFolderChanged(folderPath)
    return folderPath
  })

  ipcMain.handle('get-folder-tree', (event, folderPath) => {
    return storage.getFolderTree(folderPath)
  })

  ipcMain.handle('get-folder-history', () => storage.getFolderHistory())

  ipcMain.on('open-in-finder', (event, folderPath) => {
    shell.openPath(folderPath)
  })

  // ── Floating button position ──────────────────────────
  ipcMain.on('save-button-position', (event, pos) => {
    storage.saveButtonPosition(pos)
  })
}

module.exports = { register }
