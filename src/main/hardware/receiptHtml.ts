import type { PaperSize } from './printerConfig'
import type { Receipt } from '@shared/types'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}

function money(n: number): string {
  return n.toFixed(2)
}

const WIDTHS: Record<PaperSize, string> = { '58mm': '58mm', '80mm': '80mm', A4: '210mm' }
const FONT_SIZE: Record<PaperSize, string> = { '58mm': '10px', '80mm': '12px', A4: '13px' }

/** System/OS-print path (Electron webContents.print / print-to-PDF) — used for local/USB/virtual printers. */
export function buildReceiptHtml(receipt: Receipt, paperSize: PaperSize): string {
  const width = WIDTHS[paperSize]
  const fontSize = FONT_SIZE[paperSize]

  const itemRows = receipt.items
    .map(
      (item) => `
      <tr>
        <td colspan="2" class="item-name">${escapeHtml(item.product_name)}</td>
      </tr>
      <tr>
        <td class="muted">${item.quantity} x ${money(item.unit_price)}${item.discount ? ` &minus; ${money(item.discount)}` : ''}</td>
        <td class="right">${money(item.line_total)}</td>
      </tr>`
    )
    .join('')

  const paymentRows = receipt.payments
    .map((p) => `<tr><td>Payment</td><td class="right">${money(p.amount)}</td></tr>`)
    .join('')

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: ${width} auto; margin: ${paperSize === 'A4' ? '16mm' : '2mm'}; }
  * { box-sizing: border-box; }
  body {
    width: ${width};
    margin: 0 auto;
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
    font-size: ${fontSize};
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .muted { color: #444; }
  .bold { font-weight: 700; }
  .business-name { font-weight: 700; font-size: 1.25em; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .item-name { padding-top: 4px; font-weight: 600; }
  .totals td { padding-top: 2px; }
  footer { margin-top: 10px; }
</style>
</head>
<body>
  <div class="center">
    <div class="business-name">${escapeHtml(receipt.business?.name ?? '')}</div>
    ${receipt.branch?.name ? `<div>${escapeHtml(receipt.branch.name)}</div>` : ''}
    ${receipt.branch?.address ? `<div class="muted">${escapeHtml(receipt.branch.address)}</div>` : ''}
    ${receipt.branch?.phone ? `<div class="muted">${escapeHtml(receipt.branch.phone)}</div>` : ''}
  </div>
  <hr />
  <table>
    <tr><td>Invoice</td><td class="right">${escapeHtml(receipt.invoice_number)}${receipt.is_offline ? ' <span class="muted">(offline)</span>' : ''}</td></tr>
    <tr><td>Date</td><td class="right">${escapeHtml(new Date(receipt.sale_date).toLocaleString())}</td></tr>
    <tr><td>Cashier</td><td class="right">${escapeHtml(receipt.cashier.name)}</td></tr>
    ${receipt.customer ? `<tr><td>Customer</td><td class="right">${escapeHtml(receipt.customer.name)}</td></tr>` : ''}
  </table>
  <hr />
  <table>${itemRows}</table>
  <hr />
  <table class="totals">
    <tr><td>Subtotal</td><td class="right">${money(receipt.subtotal)}</td></tr>
    ${receipt.discount ? `<tr><td>Discount</td><td class="right">&minus;${money(receipt.discount)}</td></tr>` : ''}
    ${receipt.tax ? `<tr><td>Tax</td><td class="right">${money(receipt.tax)}</td></tr>` : ''}
    <tr class="bold"><td>TOTAL</td><td class="right">${money(receipt.total)}</td></tr>
  </table>
  <hr />
  <table>${paymentRows}</table>
  <footer class="center muted">Thank you!</footer>
</body>
</html>`
}
