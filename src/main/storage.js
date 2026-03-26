const { app } = require('electron')
const fs = require('fs')
const path = require('path')

// ── Config file (persists folder choice + button position) ────────────────
function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

function loadConfig() {
  const p = getConfigPath()
  if (!fs.existsSync(p)) return {}
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return {} }
}

function saveConfig(cfg) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), 'utf8')
}

function getActiveFolder() {
  return loadConfig().activeFolder || null
}

function setActiveFolder(folderPath) {
  const cfg = loadConfig()
  cfg.activeFolder = folderPath
  saveConfig(cfg)
}

function saveButtonPosition(pos) {
  const cfg = loadConfig()
  cfg.buttonPosition = pos
  saveConfig(cfg)
}

function getButtonPosition() {
  return loadConfig().buttonPosition || null
}

// ── Screenshots directory ─────────────────────────────────────────────────
// Uses active folder if set, otherwise userData/screenshots
function getScreenshotsDir() {
  const active = getActiveFolder()
  const dir = active
    ? path.join(active, 'screenshots')
    : path.join(app.getPath('userData'), 'screenshots')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

// ── Index file ────────────────────────────────────────────────────────────
// Always lives in userData so we can find it regardless of active folder
function getIndexPath() {
  return path.join(app.getPath('userData'), 'index.json')
}

function loadIndex() {
  const p = getIndexPath()
  if (!fs.existsSync(p)) return []
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return [] }
}

function appendEntry(entry) {
  const index = loadIndex()
  index.unshift(entry)
  const tmp = getIndexPath() + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(index, null, 2), 'utf8')
  fs.renameSync(tmp, getIndexPath())
}

// ── Thumbnail data URL ────────────────────────────────────────────────────
function getThumbnailData(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null
  const buf = fs.readFileSync(filePath)
  return 'data:image/png;base64,' + buf.toString('base64')
}

// ── Folder tree (for sidebar) ─────────────────────────────────────────────
// Returns a simple nested structure: { name, path, children[] }
function getFolderTree(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) return null
  return buildTree(folderPath, 0)
}

function buildTree(dirPath, depth) {
  const name = path.basename(dirPath)
  const node = { name, path: dirPath, children: [] }
  if (depth >= 4) return node // limit depth
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.')) continue
      node.children.push(buildTree(path.join(dirPath, entry.name), depth + 1))
    }
  } catch { /* permission denied etc */ }
  return node
}

module.exports = {
  getScreenshotsDir,
  loadIndex,
  appendEntry,
  getThumbnailData,
  getActiveFolder,
  setActiveFolder,
  getFolderTree,
  saveButtonPosition,
  getButtonPosition,
}
