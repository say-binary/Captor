const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('captorAPI', {
  // Capture flow
  startCapture: () => ipcRenderer.send('start-capture'),
  selectionComplete: (rect) => ipcRenderer.invoke('selection-complete', rect),
  cancelCapture: () => ipcRenderer.send('cancel-capture'),

  // Annotation flow
  onShowAnnotation: (cb) => ipcRenderer.on('show-annotation', (_, data) => cb(data)),
  saveHighlight: (data) => ipcRenderer.invoke('save-highlight', data),
  cancelAnnotation: () => ipcRenderer.send('cancel-annotation'),

  // Gallery
  loadHighlights: () => ipcRenderer.invoke('load-highlights'),
  getThumbnailData: (filePath) => ipcRenderer.invoke('get-thumbnail-data', filePath),
  onHighlightSaved: (cb) => ipcRenderer.on('highlight-saved', (_, entry) => cb(entry)),
  updateHighlight: (id, fields) => ipcRenderer.invoke('update-highlight', { id, fields }),
  deleteHighlight: (id) => ipcRenderer.invoke('delete-highlight', id),
  onHighlightUpdated: (cb) => ipcRenderer.on('highlight-updated', (_, entry) => cb(entry)),
  onHighlightDeleted: (cb) => ipcRenderer.on('highlight-deleted', (_, id) => cb(id)),

  // Folder management
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  getActiveFolder: () => ipcRenderer.invoke('get-active-folder'),
  setActiveFolder: (folderPath) => ipcRenderer.invoke('set-active-folder', folderPath),
  getFolderTree: (folderPath) => ipcRenderer.invoke('get-folder-tree', folderPath),
  onFolderChanged: (cb) => ipcRenderer.on('folder-changed', (_, data) => cb(data)),

  // Floating button position persistence
  saveButtonPosition: (pos) => ipcRenderer.send('save-button-position', pos),

  // Chrome extension / text highlight
  onTextHighlight: (cb) => ipcRenderer.on('text-highlight', (_, data) => cb(data)),
})
