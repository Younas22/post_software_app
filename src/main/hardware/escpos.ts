import type { Receipt } from '@shared/types'

/**
 * Minimal ESC/POS byte-stream builder for 58mm (32-col) / 80mm (42-col)
 * thermal receipt printers reachable over TCP (the common "network
 * printer" mode most POS thermal printers support on port 9100). Kept
 * intentionally small — just enough for a legible, correctly-totaled
 * receipt plus a cash-drawer kick — rather than depending on a full
 * external ESC/POS driver library.
 */
const ESC = 0x1b
const GS = 0x1d

function bytes(...values: number[]): Buffer {
  return Buffer.from(values)
}

function text(line: string): Buffer {
  return Buffer.from(`${line}\n`, 'latin1')
}

function center(): Buffer {
  return bytes(ESC, 0x61, 0x01)
}
function left(): Buffer {
  return bytes(ESC, 0x61, 0x00)
}
function bold(on: boolean): Buffer {
  return bytes(ESC, 0x45, on ? 1 : 0)
}
function init(): Buffer {
  return bytes(ESC, 0x40)
}
function cut(): Buffer {
  return bytes(GS, 0x56, 0x00)
}

/** ESC p m t1 t2 — the standard cash-drawer "kick" pulse most thermal printers relay to a connected drawer. */
export function cashDrawerKickCommand(): Buffer {
  return bytes(ESC, 0x70, 0x00, 0x19, 0xfa)
}

function padLine(left: string, right: string, width: number): string {
  const space = Math.max(1, width - left.length - right.length)
  return `${left}${' '.repeat(space)}${right}`
}

function money(n: number): string {
  return n.toFixed(2)
}

export function buildReceiptEscPos(receipt: Receipt, columns: 32 | 42): Buffer {
  const chunks: Buffer[] = [init(), center(), bold(true)]
  chunks.push(text(receipt.business?.name ?? 'Receipt'))
  chunks.push(bold(false))
  if (receipt.branch?.name) chunks.push(text(receipt.branch.name))
  if (receipt.branch?.address) chunks.push(text(receipt.branch.address))
  if (receipt.branch?.phone) chunks.push(text(receipt.branch.phone))
  chunks.push(text('-'.repeat(columns)))
  chunks.push(left())
  chunks.push(text(`Invoice: ${receipt.invoice_number}${receipt.is_offline ? ' (offline)' : ''}`))
  chunks.push(text(`Date: ${new Date(receipt.sale_date).toLocaleString()}`))
  chunks.push(text(`Cashier: ${receipt.cashier.name}`))
  if (receipt.customer) chunks.push(text(`Customer: ${receipt.customer.name}`))
  chunks.push(text('-'.repeat(columns)))

  for (const item of receipt.items) {
    chunks.push(text(item.product_name))
    const qtyPrice = `${item.quantity} x ${money(item.unit_price)}`
    chunks.push(text(padLine(qtyPrice, money(item.line_total), columns)))
  }

  chunks.push(text('-'.repeat(columns)))
  chunks.push(text(padLine('Subtotal', money(receipt.subtotal), columns)))
  if (receipt.discount > 0) chunks.push(text(padLine('Discount', `-${money(receipt.discount)}`, columns)))
  if (receipt.tax > 0) chunks.push(text(padLine('Tax', money(receipt.tax), columns)))
  chunks.push(bold(true))
  chunks.push(text(padLine('TOTAL', money(receipt.total), columns)))
  chunks.push(bold(false))
  chunks.push(text('-'.repeat(columns)))

  for (const payment of receipt.payments) {
    chunks.push(text(padLine('Payment', money(payment.amount), columns)))
  }

  chunks.push(text(''))
  chunks.push(center())
  chunks.push(text('Thank you!'))
  chunks.push(text(''))
  chunks.push(text(''))
  chunks.push(cut())

  return Buffer.concat(chunks)
}
