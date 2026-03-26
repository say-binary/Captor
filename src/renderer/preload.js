const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('captorAPI', {
  // Capture flow
  startCapture: () => ipcRenderer.send('start-capture'),
  selectionComplete: (rect) => ipcRenderer.invoke('selection-complete', rect),
  cancelCapture: () => ipcRenderer.send('cancel-capture'),

  // Annotation flow
  onShowAnnotation: (cb) => ipcRenderer.on('show-annotation', (_, data) => cb(data)),
  saveHighlight: (data) => ipcRenderer.invoke('save-highlight', data),

  // Gallery
  loadHighlights: () => ipcRenderer.invoke('load-highlights'),
  getThumbnailData: (filePath) => ipcRenderer.invoke('get-thumbnail-data', filePath),

  // Gallery refresh event
  onHighlightSaved: (cb) => ipcRenderer.on('highlight-saved', (_, entry) => cb(entry)),
})
