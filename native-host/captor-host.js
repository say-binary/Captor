#!/usr/bin/env node
/**
 * Captor Native Messaging Host
 *
 * Chrome Native Messaging protocol:
 *  - Each message is prefixed with a 4-byte LE uint32 length
 *  - Messages are JSON objects
 *  - stdin  = messages FROM Chrome extension
 *  - stdout = messages TO Chrome extension
 *
 * This host receives SAVE_HIGHLIGHT messages and forwards them to the
 * Captor Electron app via a simple local TCP socket.
 */

'use strict'

const net = require('net')

// ── Read Chrome native message from stdin ──────────────────
function readMessage(buf) {
  if (buf.length < 4) return null
  const len = buf.readUInt32LE(0)
  if (buf.length < 4 + len) return null
  const json = buf.slice(4, 4 + len).toString('utf8')
  return { message: JSON.parse(json), consumed: 4 + len }
}

// ── Write Chrome native message to stdout ──────────────────
function writeMessage(obj) {
  const json = JSON.stringify(obj)
  const buf = Buffer.allocUnsafe(4 + Buffer.byteLength(json))
  buf.writeUInt32LE(Buffer.byteLength(json), 0)
  buf.write(json, 4, 'utf8')
  process.stdout.write(buf)
}

// ── Forward to Captor Electron app via TCP ─────────────────
const CAPTOR_PORT = 34523 // must match what main.js listens on

function forwardToCaptor(message) {
  return new Promise((resolve) => {
    const client = new net.Socket()
    const timeout = setTimeout(() => {
      client.destroy()
      resolve({ ok: false, error: 'Connection timed out — is Captor running?' })
    }, 3000)

    client.connect(CAPTOR_PORT, '127.0.0.1', () => {
      client.write(JSON.stringify(message) + '\n')
    })

    client.on('data', (data) => {
      clearTimeout(timeout)
      try {
        resolve(JSON.parse(data.toString()))
      } catch {
        resolve({ ok: true })
      }
      client.destroy()
    })

    client.on('error', (err) => {
      clearTimeout(timeout)
      resolve({ ok: false, error: err.message })
    })
  })
}

// ── Main loop ──────────────────────────────────────────────
let inputBuf = Buffer.alloc(0)

process.stdin.on('data', async (chunk) => {
  inputBuf = Buffer.concat([inputBuf, chunk])

  while (true) {
    const result = readMessage(inputBuf)
    if (!result) break
    const { message, consumed } = result
    inputBuf = inputBuf.slice(consumed)

    if (message.type === 'SAVE_HIGHLIGHT') {
      const reply = await forwardToCaptor(message)
      writeMessage(reply)
    }
  }
})

process.stdin.on('end', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))
