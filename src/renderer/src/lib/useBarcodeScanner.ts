import { useEffect, useRef } from 'react'

/**
 * Phase 08: keyboard-emulation barcode scanner support. A hardware scanner
 * types digits/characters far faster than a human (typically the whole
 * code within ~30-50ms) and terminates with Enter. This listens globally
 * (works regardless of which element has focus, matching "a scanner that
 * types into a focused input should work without vendor drivers" while
 * also not requiring the barcode field specifically to be focused) and
 * only treats a burst as a scan when consecutive keystrokes are faster
 * than a human could type and the input line ends with Enter.
 */
const MAX_INTER_KEY_MS = 40
const MIN_BARCODE_LENGTH = 3

export function useBarcodeScanner(onScan: (barcode: string) => void, enabled = true): void {
  const buffer = useRef('')
  const lastKeyTime = useRef(0)

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null
      const isTypingContext = target && (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'text'))
      if (isTypingContext) return

      const now = performance.now()
      const elapsed = now - lastKeyTime.current
      lastKeyTime.current = now

      if (elapsed > MAX_INTER_KEY_MS) {
        buffer.current = ''
      }

      if (e.key === 'Enter') {
        if (buffer.current.length >= MIN_BARCODE_LENGTH) {
          onScan(buffer.current)
        }
        buffer.current = ''
        return
      }

      if (e.key.length === 1) {
        buffer.current += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onScan, enabled])
}
