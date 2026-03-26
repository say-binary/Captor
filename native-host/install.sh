#!/bin/bash
# Captor Native Messaging Host installer
# Run this once after loading the Chrome extension.
# Usage: ./install.sh <chrome-extension-id>
#
# Example:
#   ./install.sh abcdefghijklmnopabcdefghijklmnop

set -e

EXTENSION_ID="$1"
if [ -z "$EXTENSION_ID" ]; then
  echo "Usage: $0 <chrome-extension-id>"
  echo ""
  echo "Find your extension ID at chrome://extensions after loading the unpacked extension."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_WRAPPER="$SCRIPT_DIR/captor-host.sh"
HOST_SCRIPT="$SCRIPT_DIR/captor-host.js"
MANIFEST_DEST="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.captor.nativehost.json"

# Make both scripts executable
chmod +x "$HOST_WRAPPER" "$HOST_SCRIPT"

# Write the manifest pointing to the shell wrapper (so Chrome finds node)
cat > "$MANIFEST_DEST" <<EOF
{
  "name": "com.captor.nativehost",
  "description": "Captor Native Messaging Host",
  "path": "$HOST_WRAPPER",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXTENSION_ID/"]
}
EOF

echo "✓ Native messaging host registered at:"
echo "  $MANIFEST_DEST"
echo ""
echo "  Host wrapper: $HOST_WRAPPER"
echo "  Extension:    chrome-extension://$EXTENSION_ID/"
echo ""
echo "Restart Chrome if it was already open, then try saving a highlight."
