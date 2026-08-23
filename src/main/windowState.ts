import { app, BrowserWindow, screen } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { scoped } from './logging/logger'

const log = scoped('window-state')

interface WindowBounds {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

const STATE_FILE = (): string => path.join(app.getPath('userData'), 'window-state.json')

const DEFAULT_STATE: WindowBounds = { width: 1366, height: 800, isMaximized: false }

/**
 * Remembers window size/position/maximized state across launches, clamped
 * to a currently-connected display so the window can never restore fully
 * off-screen (e.g. after unplugging a second monitor).
 */
export function loadWindowState(): WindowBounds {
  try {
    const raw = fs.readFileSync(STATE_FILE(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<WindowBounds>
    const state: WindowBounds = { ...DEFAULT_STATE, ...parsed }

    const displays = screen.getAllDisplays()
    const visible =
      typeof state.x === 'number' &&
      typeof state.y === 'number' &&
      displays.some((d) => {
        const b = d.workArea
        return (
          state.x! >= b.x &&
          state.y! >= b.y &&
          state.x! < b.x + b.width &&
          state.y! < b.y + b.height
        )
      })

    if (!visible) {
      delete state.x
      delete state.y
    }

    return state
  } catch {
    return { ...DEFAULT_STATE }
  }
}

export function saveWindowState(win: BrowserWindow): void {
  try {
    const isMaximized = win.isMaximized()
    const bounds = isMaximized ? win.getNormalBounds() : win.getBounds()
    const state: WindowBounds = { ...bounds, isMaximized }
    fs.mkdirSync(path.dirname(STATE_FILE()), { recursive: true })
    fs.writeFileSync(STATE_FILE(), JSON.stringify(state), 'utf-8')
  } catch (err) {
    log.warn('Failed to persist window state', err)
  }
}

export function attachWindowStatePersistence(win: BrowserWindow): void {
  let timer: NodeJS.Timeout | null = null
  const debouncedSave = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => saveWindowState(win), 400)
  }
  win.on('resize', debouncedSave)
  win.on('move', debouncedSave)
  win.on('close', () => saveWindowState(win))
}
