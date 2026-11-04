import { app, BrowserWindow, Menu, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { is } from '@electron-toolkit/utils'
import log from './logging/logger'
import { getDb, closeDb } from './db'
import { registerIpc, registerWindowStateHandlers, loadWindowState, saveWindowState } from './ipc/registerIpc'
import { onlineMonitor } from './sync/onlineMonitor'
import { sessionManager } from './auth/sessionManager'
import { deviceManager } from './auth/deviceManager'
import { syncEngine } from './sync/syncEngine'
import { updaterService } from './updater/autoUpdater'

const logger = log.scope('main')
const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

// Single instance lock — a second POS window on the same machine would
// contend for the same SQLite file and could double-process the sync
// queue; focus the existing window instead of opening another.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

function createMainWindow(): BrowserWindow {
  const state = loadWindowState()

  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    title: 'Universal POS',
    webPreferences: {
      // Master spec security rule — no exceptions.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, '../preload/index.js')
    }
  })

  if (state.isMaximized) win.maximize()

  win.on('ready-to-show', () => win.show())
  registerWindowStateHandlers(win)

  win.webContents.setWindowOpenHandler(({ url }) => {
    // Links can come from server data (e.g. the Super Admin's live-chat
    // link), so only hand safe schemes to the OS — never file:, javascript:, etc.
    try {
      const { protocol } = new URL(url)
      if (['http:', 'https:', 'mailto:', 'tel:'].includes(protocol)) void shell.openExternal(url)
    } catch {
      /* malformed URL — ignore */
    }
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return win
}

function buildAppMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{ label: app.name, submenu: [{ role: 'about' as const }, { type: 'separator' as const }, { role: 'quit' as const }] }]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        ...(is.dev ? [{ role: 'toggleDevTools' as const }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }] }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(async () => {
  logger.info(`App starting — version ${app.getVersion()}, platform ${process.platform}`)

  // Initialize SQLite + run any pending migrations before anything else
  // touches the database (Phase 04).
  getDb()

  buildAppMenu()
  mainWindow = createMainWindow()
  registerIpc(() => mainWindow)

  onlineMonitor.start()
  updaterService.init()

  // Session/device validation happens after the window exists so progress
  // can be shown, but before the renderer assumes it has a usable session.
  await sessionManager.restore()
  const deviceStatus = await deviceManager.validate()
  if (onlineMonitor.getStatus() === 'online' && deviceStatus.isRegistered && !deviceStatus.unauthorized) {
    void syncEngine.runIncrementalSync()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (mainWindow) saveWindowState(mainWindow)
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  onlineMonitor.stop()
  closeDb()
})

// Never let an unexpected renderer/main error take down an in-progress
// sale silently — log it with full context instead of a bare crash.
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception in main process', err)
})
