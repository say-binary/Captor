# Captor Chrome Extension

Lets you select text on any webpage and save it to the Captor desktop app.

## How to load (one-time setup)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select this `chrome-extension/` folder
5. Note the **Extension ID** shown on the card (looks like `abcdefghijklmnopabcdefghijklmnop`)

## Register the native messaging host (one-time setup)

Open a terminal and run:

```bash
cd /path/to/Captor/native-host
./install.sh YOUR_EXTENSION_ID
```

Replace `YOUR_EXTENSION_ID` with the ID from step 5 above.

## Usage

1. Make sure Captor desktop app is running
2. In any webpage, select some text
3. A **"📌 Save to Captor"** button appears near your cursor
4. Click it — the Captor annotation window opens with your selected text
5. Add a note and tags, then click **Save Highlight**
