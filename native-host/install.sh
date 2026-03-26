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
HOST_SCRIPT="$SCRIPT_DIR/captor-host.js"
MANIFEST_SRC="$SCRIPT_DIR/com.captor.nativehost.json"
MANIFEST_DEST="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.captor.nativehost.json"

# Make the host script executable
chmod +x "$HOST_SCRIPT"

# Write the manifest with correct absolute path and extension ID
cat > "$MANIFEST_DEST" <<EOF
{
  "name": "com.captor.nativehost",
  "description": "Captor Native Messaging Host",
  "path": "$HOST_SCRIPT",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXTENSION_ID/"]
}
EOF

echo "✓ Native messaging host registered at:"
echo "  $MANIFEST_DEST"
echo ""
echo "  Host script: $HOST_SCRIPT"
echo "  Extension:   chrome-extension://$EXTENSION_ID/"
echo ""
echo "Restart Chrome if it was already open, then try saving a highlight."
