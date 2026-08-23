import { BrowserWindow } from 'electron'
import net from 'node:net'
import { getPrinterConfig, setPrinterConfig, type PrinterConfig } from './printerConfig'
import { buildReceiptEscPos, cashDrawerKickCommand } from './escpos'
import { buildReceiptHtml } from './receiptHtml'
import { scoped } from '../logging/logger'
import type { PrinterInfo, Receipt } from '@shared/types'

const log = scoped('printer')

export interface HardwareResult {
  ok: boolean
  message?: string
}

function columnsFor(paperSize: PrinterConfig['paperSize']): 32 | 42 {
  return paperSize === '58mm' ? 32 : 42
}

async function writeToNetworkPrinter(host: string, port: number, payload: Buffer, timeoutMs = 6000): Promise<HardwareResult> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false

    const finish = (result: HardwareResult): void => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(result)
    }

    socket.setTimeout(timeoutMs)
    socket.once('timeout', () => finish({ ok: false, message: 'Printer connection timed out.' }))
    socket.once('error', (err) => finish({ ok: false, message: `Printer connection failed: ${err.message}` }))
    socket.connect(port, host, () => {
      socket.write(payload, (err) => {
        if (err) finish({ ok: false, message: err.message })
        else finish({ ok: true })
      })
    })
  })
}

/** Renders receipt HTML in a hidden, disposable window for the OS print path. */
async function printViaSystemDialog(html: string, printerName: string | null, silent: boolean): Promise<HardwareResult> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true, sandbox: true }
  })

  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    return await new Promise<HardwareResult>((resolve) => {
      win.webContents.print(
        { silent, deviceName: printerName ?? undefined, printBackground: true, margins: { marginType: 'none' } },
        (success, errorType) => {
          resolve(success ? { ok: true } : { ok: false, message: errorType || 'Print failed.' })
        }
      )
    })
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Failed to render receipt for printing.' }
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}

export async function listSystemPrinters(): Promise<PrinterInfo[]> {
  const probe = new BrowserWindow({ show: false, webPreferences: { offscreen: true, sandbox: true } })
  try {
    await probe.loadURL('data:text/html,<html></html>')
    const printers = await probe.webContents.getPrintersAsync()
    return printers.map((p) => ({ name: p.name, displayName: p.displayName || p.name, isDefault: p.isDefault }))
  } catch (err) {
    log.error('Failed to enumerate system printers', err)
    return []
  } finally {
    if (!probe.isDestroyed()) probe.destroy()
  }
}

export function getPrinterSettings(): PrinterConfig {
  return getPrinterConfig()
}

export function updatePrinterSettings(config: Partial<PrinterConfig>): PrinterConfig {
  return setPrinterConfig(config)
}

/**
 * Phase 09 rule: a printer failure must never make the sale disappear. This
 * function is always called AFTER the sale is already durably saved in
 * SQLite (see IPC handler) — a failure here only affects whether paper came
 * out, never the transaction record.
 */
export async function printReceipt(receipt: Receipt, silent = true): Promise<HardwareResult> {
  const config = getPrinterConfig()

  try {
    if (config.connection === 'network' && config.networkHost) {
      const payload = buildReceiptEscPos(receipt, columnsFor(config.paperSize))
      const result = await writeToNetworkPrinter(config.networkHost, config.networkPort, payload)
      if (result.ok && config.openCashDrawerAfterSale) {
        await writeToNetworkPrinter(config.networkHost, config.networkPort, cashDrawerKickCommand()).catch(() => undefined)
      }
      if (!result.ok) log.error('Network receipt print failed', result.message)
      return result
    }

    const html = buildReceiptHtml(receipt, config.paperSize)
    const result = await printViaSystemDialog(html, config.systemPrinterName, silent)
    if (!result.ok) log.error('System receipt print failed', result.message)
    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown printer error.'
    log.error('printReceipt threw unexpectedly', err)
    return { ok: false, message }
  }
}

/**
 * Manual cash-drawer open action (for authorized users, or automatically
 * after a cash payment — see printReceipt above). Only meaningful for a
 * network ESC/POS printer today; a local/USB Windows printer has no
 * standard cross-vendor raw-byte path without a vendor driver/native
 * addon, so this is a documented limitation, not a silent failure —
 * callers get a clear "not supported for this printer" message.
 */
export async function openCashDrawer(): Promise<HardwareResult> {
  const config = getPrinterConfig()
  if (config.connection !== 'network' || !config.networkHost) {
    return {
      ok: false,
      message: 'Cash drawer control requires a network (ESC/POS) printer profile. Configure one in Settings > Printer.'
    }
  }
  return writeToNetworkPrinter(config.networkHost, config.networkPort, cashDrawerKickCommand())
}
