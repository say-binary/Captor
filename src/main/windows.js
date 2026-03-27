const { BrowserWindow, screen } = require('electron')
const path = require('path')
const storage = require('./storage')

const preload = path.join(__dirname, '../renderer/preload.js')

let galleryWin = null
let overlayWin = null
let floatingBtnWin = null
let annotationWin = null

function createGalleryWindow() {
  galleryWin = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 700,
    minHeight: 500,
    title: 'Captor',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  galleryWin.loadFile(path.join(__dirname, '../renderer/gallery/gallery.html'))
  galleryWin.on('closed', () => { galleryWin = null })
  return galleryWin
}

function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().bounds

  overlayWin = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    show: false,
    focusable: true,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  overlayWin.loadFile(path.join(__dirname, '../renderer/overlay/overlay.html'))
  overlayWin.setAlwaysOnTop(true, 'screen-saver')
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWin.on('closed', () => { overlayWin = null })
  return overlayWin
}

function createFloatingButtonWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  // Restore persisted position or default to bottom-right
  const saved = storage.getButtonPosition()
  const x = saved ? saved.x : width - 72
  const y = saved ? saved.y : height - 72

  floatingBtnWin = new BrowserWindow({
    width: 52,
    height: 52,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: true,
    movable: true,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  floatingBtnWin.loadFile(
    path.join(__dirname, '../renderer/floatingBtn/floatingBtn.html')
  )
  floatingBtnWin.setAlwaysOnTop(true, 'floating')
  floatingBtnWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Persist position whenever the user stops moving the window
  floatingBtnWin.on('moved', () => {
    const [wx, wy] = floatingBtnWin.getPosition()
    storage.saveButtonPosition({ x: wx, y: wy })
  })

  floatingBtnWin.on('closed', () => { floatingBtnWin = null })
  return floatingBtnWin
}

function createAnnotationWindow() {
  annotationWin = new BrowserWindow({
    width: 520,
    height: 440,
    frame: true,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    title: 'Save Highlight',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  annotationWin.loadFile(
    path.join(__dirname, '../renderer/annotation/annotation.html')
  )
  annotationWin.on('closed', () => { annotationWin = null })
  return annotationWin
}

function showOverlay() {
  if (!overlayWin) createOverlayWindow()

  const cursorPoint = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursorPoint)
  const { x, y, width, height } = display.bounds

  overlayWin.setBounds({ x, y, width, height })
  overlayWin.setAlwaysOnTop(true, 'screen-saver')
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWin.show()
  overlayWin.focus()
}

function hideOverlay() {
  if (overlayWin) overlayWin.hide()
}

let _annotationBusy = false

function showAnnotation(data) {
  // Guard: ignore duplicate calls while annotation window is already showing.
  // This prevents a double-dialog when the hotkey and the Chrome extension
  // native host both fire for the same text selection.
  if (_annotationBusy) return
  _annotationBusy = true

  if (!annotationWin) createAnnotationWindow()
  annotationWin.show()
  annotationWin.focus()

  const send = () => annotationWin.webContents.send('show-annotation', data)
  if (annotationWin.webContents.isLoading()) {
    annotationWin.webContents.once('did-finish-load', send)
  } else {
    send()
  }
}

function hideAnnotation() {
  _annotationBusy = false
  if (annotationWin) annotationWin.hide()
}

function refreshGallery(entry) {
  if (galleryWin && !galleryWin.isDestroyed()) {
    galleryWin.webContents.send('highlight-saved', entry)
  }
}

function broadcastFolderChanged(folderPath) {
  for (const win of [galleryWin, annotationWin]) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('folder-changed', { folderPath })
    }
  }
}

function broadcastHighlightUpdated(entry) {
  if (galleryWin && !galleryWin.isDestroyed()) {
    galleryWin.webContents.send('highlight-updated', entry)
  }
}

function broadcastHighlightDeleted(id) {
  if (galleryWin && !galleryWin.isDestroyed()) {
    galleryWin.webContents.send('highlight-deleted', id)
  }
}

function triggerCapture() {
  showOverlay()
}

module.exports = {
  createGalleryWindow,
  createOverlayWindow,
  createFloatingButtonWindow,
  createAnnotationWindow,
  showOverlay,
  hideOverlay,
  showAnnotation,
  hideAnnotation,
  refreshGallery,
  broadcastFolderChanged,
  broadcastHighlightUpdated,
  broadcastHighlightDeleted,
  triggerCapture,
  getAnnotationWin: () => annotationWin,
  getGalleryWin: () => galleryWin,
}
