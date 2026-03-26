const { BrowserWindow, screen } = require('electron')
const path = require('path')

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
  // Use primary display size; will be repositioned to the active display on show
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
  // 'screen-saver' level puts it above everything including full-screen apps
  overlayWin.setAlwaysOnTop(true, 'screen-saver')
  // visibleOnAllWorkspaces makes it appear on every Space / desktop
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWin.on('closed', () => { overlayWin = null })
  return overlayWin
}

function createFloatingButtonWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  floatingBtnWin = new BrowserWindow({
    width: 52,
    height: 52,
    x: width - 72,
    y: height - 72,
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
  floatingBtnWin.on('closed', () => { floatingBtnWin = null })
  return floatingBtnWin
}

function createAnnotationWindow() {
  annotationWin = new BrowserWindow({
    width: 520,
    height: 420,
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

  // Position overlay over the display containing the cursor
  const cursorPoint = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursorPoint)
  const { x, y, width, height } = display.bounds

  overlayWin.setBounds({ x, y, width, height })
  // Re-apply after setBounds — macOS can reset these on window move
  overlayWin.setAlwaysOnTop(true, 'screen-saver')
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  overlayWin.show()
  overlayWin.focus()
}

function hideOverlay() {
  if (overlayWin) overlayWin.hide()
}

function showAnnotation(data) {
  if (!annotationWin) createAnnotationWindow()
  annotationWin.show()
  annotationWin.focus()
  // Wait for renderer to be ready before sending
  if (annotationWin.webContents.isLoading()) {
    annotationWin.webContents.once('did-finish-load', () => {
      annotationWin.webContents.send('show-annotation', data)
    })
  } else {
    annotationWin.webContents.send('show-annotation', data)
  }
}

function hideAnnotation() {
  if (annotationWin) annotationWin.hide()
}

function refreshGallery(entry) {
  if (galleryWin && !galleryWin.isDestroyed()) {
    galleryWin.webContents.send('highlight-saved', entry)
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
  triggerCapture,
  getAnnotationWin: () => annotationWin,
  getGalleryWin: () => galleryWin,
}
