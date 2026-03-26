#!/bin/bash
# Wrapper so Chrome can find node regardless of PATH
# Chrome launches native hosts with a minimal environment that doesn't include
# /opt/homebrew/bin, so we resolve node explicitly here.

NODE_PATH=""

# Try common locations in order
for candidate in \
  /opt/homebrew/bin/node \
  /usr/local/bin/node \
  /usr/bin/node \
  "$(command -v node 2>/dev/null)"
do
  if [ -x "$candidate" ]; then
    NODE_PATH="$candidate"
    break
  fi
done

if [ -z "$NODE_PATH" ]; then
  echo '{"ok":false,"error":"node not found"}' >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$NODE_PATH" "$SCRIPT_DIR/captor-host.js"
