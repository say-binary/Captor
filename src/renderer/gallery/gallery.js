let allHighlights = []
let activeTag = '__all__'
let searchQuery = ''
let sortOrder = 'newest'

// ── Init ───────────────────────────────────────────────
async function init() {
  // Load active folder and update label
  const folderPath = await window.captorAPI.getActiveFolder()
  updateFolderLabel(folderPath)
  if (folderPath) {
    renderFolderTree(folderPath)
  }

  // Load highlights
  allHighlights = await window.captorAPI.loadHighlights()
  renderTagSidebar()
  renderGrid()
}

init()

// Listen for newly saved highlights
window.captorAPI.onHighlightSaved((entry) => {
  allHighlights.unshift(entry)
  renderTagSidebar()
  renderGrid()
})

// Listen for folder changes from other windows
window.captorAPI.onFolderChanged(({ folderPath }) => {
  updateFolderLabel(folderPath)
  renderFolderTree(folderPath)
  // Reload highlights from new folder
  window.captorAPI.loadHighlights().then((list) => {
    allHighlights = list
    renderTagSidebar()
    renderGrid()
  })
})

// ── Folder UI ──────────────────────────────────────────
function updateFolderLabel(folderPath) {
  const label = document.getElementById('activeFolderLabel')
  if (folderPath) {
    // Show just the last path segment
    const parts = folderPath.replace(/\\/g, '/').split('/')
    label.textContent = parts[parts.length - 1] || folderPath
    label.title = folderPath
  } else {
    label.textContent = 'Default (App Data)'
    label.title = ''
  }
}

async function renderFolderTree(rootPath) {
  const treeEl = document.getElementById('folderTree')
  treeEl.innerHTML = ''
  if (!rootPath) return

  try {
    const tree = await window.captorAPI.getFolderTree(rootPath)
    if (tree && tree.children && tree.children.length > 0) {
      tree.children.forEach((node) => {
        treeEl.appendChild(buildTreeNode(node, 0))
      })
    }
  } catch (e) {
    console.error('Failed to render folder tree:', e)
  }
}

function buildTreeNode(node, depth) {
  const wrapper = document.createElement('div')
  wrapper.className = 'tree-node'

  const row = document.createElement('div')
  row.className = 'tree-row'
  row.style.paddingLeft = `${4 + depth * 14}px`

  // Toggle arrow (only for nodes with children)
  const toggle = document.createElement('span')
  toggle.className = 'tree-toggle'
  toggle.innerHTML = node.children && node.children.length > 0 ? '&#9654;' : ''
  row.appendChild(toggle)

  // Folder icon
  const icon = document.createElement('span')
  icon.className = 'tree-icon'
  icon.textContent = '📁'
  row.appendChild(icon)

  // Name
  const name = document.createElement('span')
  name.className = 'tree-name'
  name.textContent = node.name
  name.title = node.path
  row.appendChild(name)

  wrapper.appendChild(row)

  // Children container
  let childrenEl = null
  if (node.children && node.children.length > 0) {
    childrenEl = document.createElement('div')
    childrenEl.className = 'tree-children'
    node.children.forEach((child) => {
      childrenEl.appendChild(buildTreeNode(child, depth + 1))
    })
    wrapper.appendChild(childrenEl)

    // Toggle expand/collapse
    row.addEventListener('click', (e) => {
      e.stopPropagation()
      const isOpen = childrenEl.classList.toggle('open')
      toggle.classList.toggle('open', isOpen)
      icon.textContent = isOpen ? '📂' : '📁'
    })
  }

  return wrapper
}

document.getElementById('chooseFolderBtn').addEventListener('click', async () => {
  const folderPath = await window.captorAPI.chooseFolder()
  if (folderPath) {
    updateFolderLabel(folderPath)
    renderFolderTree(folderPath)
    // Reload highlights from new folder
    allHighlights = await window.captorAPI.loadHighlights()
    renderTagSidebar()
    renderGrid()
  }
})

// ── Filtering & sorting ────────────────────────────────
function getFiltered() {
  let list = allHighlights.slice()

  if (activeTag !== '__all__') {
    list = list.filter((h) => h.tags && h.tags.includes(activeTag))
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    list = list.filter(
      (h) =>
        (h.note && h.note.toLowerCase().includes(q)) ||
        (h.tags && h.tags.some((t) => t.toLowerCase().includes(q))) ||
        (h.highlightedText && h.highlightedText.toLowerCase().includes(q)) ||
        (h.sourceUrl && h.sourceUrl.toLowerCase().includes(q))
    )
  }

  if (sortOrder === 'oldest') list.reverse()

  return list
}

// ── Render tag sidebar ─────────────────────────────────
function renderTagSidebar() {
  const tagSet = new Set()
  allHighlights.forEach((h) => (h.tags || []).forEach((t) => tagSet.add(t)))

  const tagList = document.getElementById('tagList')
  tagList.innerHTML = ''

  const allBtn = document.createElement('button')
  allBtn.className = 'tag-pill' + (activeTag === '__all__' ? ' active' : '')
  allBtn.dataset.tag = '__all__'
  allBtn.textContent = 'All'
  tagList.appendChild(allBtn)

  Array.from(tagSet)
    .sort()
    .forEach((tag) => {
      const btn = document.createElement('button')
      btn.className = 'tag-pill' + (activeTag === tag ? ' active' : '')
      btn.dataset.tag = tag
      btn.textContent = tag
      tagList.appendChild(btn)
    })
}

document.getElementById('tagList').addEventListener('click', (e) => {
  const btn = e.target.closest('.tag-pill')
  if (!btn) return
  activeTag = btn.dataset.tag
  document.querySelectorAll('.tag-pill').forEach((b) => b.classList.remove('active'))
  btn.classList.add('active')
  document.getElementById('viewTitle').textContent =
    activeTag === '__all__' ? 'All Highlights' : `#${activeTag}`
  renderGrid()
})

// ── Render grid ────────────────────────────────────────
async function renderGrid() {
  const list = getFiltered()
  const grid = document.getElementById('grid')
  const emptyState = document.getElementById('emptyState')
  const countLabel = document.getElementById('countLabel')

  countLabel.textContent = `${allHighlights.length} highlight${allHighlights.length !== 1 ? 's' : ''}`

  if (list.length === 0) {
    grid.style.display = 'none'
    emptyState.style.display = 'flex'
    return
  }

  grid.style.display = 'grid'
  emptyState.style.display = 'none'
  grid.innerHTML = ''

  for (const highlight of list) {
    const card = await buildCard(highlight)
    grid.appendChild(card)
  }
}

async function buildCard(highlight) {
  const card = document.createElement('div')
  card.className = 'card'
  card.dataset.id = highlight.id

  const imgWrap = document.createElement('div')
  let dataURL = null

  if (highlight.type === 'text-highlight') {
    // Text-only card
    imgWrap.className = 'card-img-wrap text-only'
    const excerpt = document.createElement('div')
    excerpt.className = 'card-highlight-excerpt'
    excerpt.textContent = highlight.highlightedText || ''
    imgWrap.appendChild(excerpt)

    // Source label below excerpt
    if (highlight.sourceUrl) {
      const src = document.createElement('div')
      src.className = 'card-source'
      src.textContent = highlight.sourceUrl
      src.title = highlight.sourceUrl
      imgWrap.appendChild(src)
    }
  } else {
    // Screenshot card
    imgWrap.className = 'card-img-wrap'
    const img = document.createElement('img')
    img.alt = highlight.note || 'Highlight'
    dataURL = await window.captorAPI.getThumbnailData(highlight.filePath)
    if (dataURL) img.src = dataURL
    imgWrap.appendChild(img)
  }

  const body = document.createElement('div')
  body.className = 'card-body'

  const noteEl = document.createElement('div')
  noteEl.className = 'card-note' + (highlight.note ? '' : ' empty')
  noteEl.textContent = highlight.note || 'No note'
  body.appendChild(noteEl)

  if (highlight.tags && highlight.tags.length > 0) {
    const tagsEl = document.createElement('div')
    tagsEl.className = 'card-tags'
    highlight.tags.forEach((tag) => {
      const badge = document.createElement('span')
      badge.className = 'tag-badge'
      badge.textContent = tag
      tagsEl.appendChild(badge)
    })
    body.appendChild(tagsEl)
  }

  const dateEl = document.createElement('div')
  dateEl.className = 'card-date'
  dateEl.textContent = formatDate(highlight.timestamp)
  body.appendChild(dateEl)

  card.appendChild(imgWrap)
  card.appendChild(body)

  card.addEventListener('click', () => openLightbox(highlight, dataURL))
  return card
}

// ── Lightbox ───────────────────────────────────────────
function openLightbox(highlight, dataURL) {
  const lb = document.getElementById('lightbox')
  const imgEl = document.getElementById('lightboxImg')

  // Image (only for screenshots)
  if (highlight.type !== 'text-highlight' && dataURL) {
    imgEl.src = dataURL
    imgEl.style.display = 'block'
  } else {
    imgEl.src = ''
    imgEl.style.display = 'none'
  }

  document.getElementById('lightboxNote').textContent = highlight.note || ''
  document.getElementById('lightboxDate').textContent = formatDate(highlight.timestamp)

  const tagsEl = document.getElementById('lightboxTags')
  tagsEl.innerHTML = ''
  ;(highlight.tags || []).forEach((tag) => {
    const badge = document.createElement('span')
    badge.className = 'tag-badge'
    badge.textContent = tag
    tagsEl.appendChild(badge)
  })

  // Highlighted text block
  const highlightBlock = document.getElementById('lightboxHighlightBlock')
  const highlightText = document.getElementById('lightboxHighlightText')
  const sourceUrlEl = document.getElementById('lightboxSourceUrl')

  if (highlight.highlightedText && highlight.highlightedText.trim()) {
    highlightText.textContent = highlight.highlightedText
    if (highlight.sourceUrl) {
      sourceUrlEl.textContent = highlight.sourceUrl
      sourceUrlEl.href = highlight.sourceUrl
      sourceUrlEl.style.display = 'block'
    } else {
      sourceUrlEl.style.display = 'none'
    }
    highlightBlock.style.display = 'block'
  } else {
    highlightBlock.style.display = 'none'
  }

  lb.style.display = 'flex'
}

document.getElementById('lightbox').addEventListener('click', (e) => {
  if (
    e.target.classList.contains('lightbox-backdrop') ||
    e.target.classList.contains('lightbox-close')
  ) {
    document.getElementById('lightbox').style.display = 'none'
  }
})

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.getElementById('lightbox').style.display = 'none'
})

// ── Controls ───────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', (e) => {
  searchQuery = e.target.value.trim()
  renderGrid()
})

document.getElementById('sortSelect').addEventListener('change', (e) => {
  sortOrder = e.target.value
  renderGrid()
})

// ── Utils ──────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  )
}
