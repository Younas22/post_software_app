import { getSetting, setSetting } from '../db/repositories/syncMetaRepo'
import type { PrinterConfig } from '@shared/types'

export type { PaperSize, PrinterConnection, PrinterConfig } from '@shared/types'

const KEY = 'printer_config'

const DEFAULTS: PrinterConfig = {
  connection: 'system',
  systemPrinterName: null,
  networkHost: null,
  networkPort: 9100,
  paperSize: '80mm',
  openCashDrawerAfterSale: true
}

export function getPrinterConfig(): PrinterConfig {
  const raw = getSetting(KEY)
  if (!raw) return { ...DEFAULTS }
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PrinterConfig>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setPrinterConfig(config: Partial<PrinterConfig>): PrinterConfig {
  const next = { ...getPrinterConfig(), ...config }
  setSetting(KEY, JSON.stringify(next))
  return next
}
