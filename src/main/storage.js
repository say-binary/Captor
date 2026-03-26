const { app } = require('electron')
const fs = require('fs')
const path = require('path')

function getScreenshotsDir() {
  const dir = path.join(app.getPath('userData'), 'screenshots')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getIndexPath() {
  return path.join(app.getPath('userData'), 'index.json')
}

function loadIndex() {
  const p = getIndexPath()
  if (!fs.existsSync(p)) return []
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return []
  }
}

function appendEntry(entry) {
  const index = loadIndex()
  index.unshift(entry) // newest first
  const tmp = getIndexPath() + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(index, null, 2), 'utf8')
  fs.renameSync(tmp, getIndexPath()) // atomic write
}

function getThumbnailData(filePath) {
  if (!fs.existsSync(filePath)) return null
  const buf = fs.readFileSync(filePath)
  return 'data:image/png;base64,' + buf.toString('base64')
}

module.exports = { getScreenshotsDir, loadIndex, appendEntry, getThumbnailData }
