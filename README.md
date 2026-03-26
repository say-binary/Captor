# Captor

Save text highlights and screenshots from any app — Chrome, PDFs, Word, Pages, Safari, etc.

## Requirements

- macOS (Apple Silicon or Intel)
- Node.js 18+
- Xcode Command Line Tools (`xcode-select --install`)

## Setup

```bash
git clone https://github.com/say-binary/Captor.git
cd Captor
npm install      # also compiles the Swift CGEvent helper automatically
npm start
```

## Usage

### Capture text (any app)
1. Select text in Chrome, a PDF, Word, Pages, Preview, Safari — anywhere
2. Press **Cmd+Shift+S**
3. The Save Highlight window appears — add a note and tags, then click **Save Highlight**

### Capture a screenshot region
1. Press **Cmd+Shift+H** (or click the floating button if enabled)
2. Drag a region on screen
3. Add a note and tags in the annotation window

### Browse highlights
The gallery window opens on launch. Filter by tags or search text.

## macOS Permissions

On first launch, macOS will prompt for **Screen Recording** permission (needed for screenshot capture). Grant it in System Settings → Privacy & Security → Screen Recording.

No Accessibility permission is needed — text capture uses CGEvent at the HID level.

## Chrome Extension (optional — for capturing source URL with highlights)

The Chrome extension sends the page URL and title alongside the highlight text.

1. Open `chrome://extensions` → enable **Developer mode**
2. Click **Load unpacked** → select the `chrome-extension/` folder
3. Note the extension ID shown on the card
4. Run the native host installer:
   ```bash
   cd native-host
   ./install.sh <your-extension-id>
   ```
5. Restart Chrome

Once installed, highlights captured from Chrome will include the source URL in the gallery.

## Project Structure

```
Captor/
├── helpers/
│   └── copy_selection.swift   # CGEvent helper — compiled by npm install
├── chrome-extension/          # Optional Chrome extension
├── native-host/               # Native messaging bridge for extension
├── scripts/
│   └── build-helpers.js       # Postinstall: compiles Swift helpers
└── src/
    ├── main/                  # Electron main process
    └── renderer/              # UI windows (gallery, annotation, overlay)
```
