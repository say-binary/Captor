import Cocoa

// Post Cmd+C as a hardware-level HID event — no Accessibility permission needed.
// CGEventPost to kCGHIDEventTap injects at the driver level, bypassing TCC checks.
let src = CGEventSource(stateID: .hidSystemState)

let keyDown = CGEvent(keyboardEventSource: src, virtualKey: 0x08, keyDown: true) // 0x08 = 'c'
keyDown?.flags = .maskCommand
keyDown?.post(tap: .cghidEventTap)

let keyUp = CGEvent(keyboardEventSource: src, virtualKey: 0x08, keyDown: false)
keyUp?.flags = .maskCommand
keyUp?.post(tap: .cghidEventTap)

// Give target app time to process and write to clipboard
Thread.sleep(forTimeInterval: 0.15)
