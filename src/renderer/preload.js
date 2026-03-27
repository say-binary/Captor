const { contextBridge, ipcRenderer } = require('electron')

// Safe event subscription: removes any previous listener before adding the new
// one, preventing accumulation across hot-reloads or repeated calls.
function on(channel, cb) {
  ipcRenderer.removeAllListeners(channel)
  ipcRenderer.on(channel, (_, ...args) => cb(...args))
}

contextBridge.exposeInMainWorld('captorAPI', {
  // Capture flow
  startCapture: () => ipcRenderer.send('start-capture'),
  selectionComplete: (rect) => ipcRenderer.invoke('selection-complete', rect),
  cancelCapture: () => ipcRenderer.send('cancel-capture'),

  // Annotation flow
  onShowAnnotation: (cb) => on('show-annotation', cb),
  saveHighlight: (data) => ipcRenderer.invoke('save-highlight', data),
  cancelAnnotation: () => ipcRenderer.send('cancel-annotation'),

  // Gallery
  loadHighlights: () => ipcRenderer.invoke('load-highlights'),
  getThumbnailData: (filePath) => ipcRenderer.invoke('get-thumbnail-data', filePath),
  onHighlightSaved: (cb) => on('highlight-saved', cb),
  updateHighlight: (id, fields) => ipcRenderer.invoke('update-highlight', { id, fields }),
  deleteHighlight: (id) => ipcRenderer.invoke('delete-highlight', id),
  onHighlightUpdated: (cb) => on('highlight-updated', cb),
  onHighlightDeleted: (cb) => on('highlight-deleted', cb),

  // Folder management
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  getActiveFolder: () => ipcRenderer.invoke('get-active-folder'),
  setActiveFolder: (folderPath) => ipcRenderer.invoke('set-active-folder', folderPath),
  getFolderTree: (folderPath) => ipcRenderer.invoke('get-folder-tree', folderPath),
  getFolderHistory: () => ipcRenderer.invoke('get-folder-history'),
  openInFinder: (folderPath) => ipcRenderer.send('open-in-finder', folderPath),
  onFolderChanged: (cb) => on('folder-changed', cb),

  // Floating button position persistence
  saveButtonPosition: (pos) => ipcRenderer.send('save-button-position', pos),

  // Chrome extension / text highlight
  onTextHighlight: (cb) => on('text-highlight', cb),
})
