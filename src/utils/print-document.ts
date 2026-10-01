import api from '@/services/api/client'
export const defaultPrintTemplate = {
  templateStyle: 'modern' as 'modern' | 'classic' | 'compact',
  fontSize: 11,
  pageSize: 'A4',
  orientation: 'portrait',
  marginMm: 14,
  showCompany: true,
  showReference: true,
  showNotes: true,
  showTax: true,
  showSignature: true,
  showPaymentInfo: false,
  showPageNumber: true,
  headerTitle: '',
  accentColor: '#2563eb',
  paymentInfo: '',
  paymentTerms: '',
  paymentQr: '',
  partnerLabel: '',
  totalLabel: 'Total Tagihan',
  signatureLabels: ['Dibuat oleh', 'Disetujui oleh', 'Diterima oleh'] as string[],
  columns: ['code', 'name', 'quantity', 'unit', 'price', 'tax', 'subtotal'] as string[],
  watermark: '' as '' | 'DRAFT' | 'LUNAS' | 'DIBATALKAN',
  footer: 'Terima kasih. Simpan dokumen ini sebagai bukti transaksi.',
}
export type PrintTemplate = typeof defaultPrintTemplate
export type PrintInvoice = {
  document_label?: string
  invoice_number: string
  invoice_date: string
  due_date: string
  currency: string
  customer_name?: string
  supplier_name?: string
  reference?: string | null
  notes?: string | null
  subtotal: string | number
  discount: string | number
  tax: string | number
  withholding_amount?: string | number
  grand_total: string | number
  lines?: Array<{
    item_code: string
    item_name: string
    quantity: string | number
    unit_code: string
    unit_price: string | number
    subtotal: string | number
    tax_amount: string | number
    discount_amount?: string | number
  }>
}
const escape = (v: unknown) =>
  String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
export function documentHtml(
  invoice: PrintInvoice,
  template: PrintTemplate,
  company: Record<string, unknown> | null = null,
) {
  const t = { ...defaultPrintTemplate, ...template },
    font = Math.min(18, Math.max(8, Number(t.fontSize) || 11)),
    page = ['A4', 'A5', 'Letter'].includes(t.pageSize) ? t.pageSize : 'A4',
    orientation = t.orientation === 'landscape' ? 'landscape' : 'portrait'
  const money = (v: string | number) =>
    escape(
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: invoice.currency }).format(
        Number(v),
      ),
    )
  const defaultTitle = invoice.document_label ?? (invoice.supplier_name ? 'Invoice Pembelian' : 'Invoice Penjualan')
  const defaultPartnerLabel = invoice.supplier_name ? 'Pemasok' : 'Pelanggan'
  const allowedColumns = ['code', 'name', 'quantity', 'unit', 'price', 'discount', 'tax', 'subtotal']
  const columns = (Array.isArray(t.columns) ? t.columns : defaultPrintTemplate.columns)
    .filter((column, index, all) => allowedColumns.includes(column) && all.indexOf(column) === index)
  if (!columns.includes('name')) columns.unshift('name')
  const columnMap: Record<string, { label: string; number?: boolean; value: (line: NonNullable<PrintInvoice['lines']>[number]) => string }> = {
    code: { label: 'Kode', value: (line) => escape(line.item_code) },
    name: { label: 'Nama Barang/Jasa', value: (line) => escape(line.item_name) },
    quantity: { label: 'QTY', number: true, value: (line) => escape(line.quantity) },
    unit: { label: 'Satuan', value: (line) => escape(line.unit_code) },
    price: { label: 'Harga', number: true, value: (line) => money(line.unit_price) },
    discount: { label: 'Diskon', number: true, value: (line) => money(line.discount_amount ?? 0) },
    tax: { label: 'Pajak', number: true, value: (line) => money(line.tax_amount) },
    subtotal: { label: 'Subtotal', number: true, value: (line) => money(line.subtotal) },
  }
  const visibleColumns = columns.filter((column) => t.showTax || column !== 'tax')
  const tableHead = visibleColumns.map((column) => `<th${columnMap[column].number ? ' class="number"' : ''}>${columnMap[column].label}</th>`).join('')
  const tableRows = (invoice.lines ?? []).map((line) => `<tr>${visibleColumns.map((column) => `<td${columnMap[column].number ? ' class="number"' : ''}>${columnMap[column].value(line)}</td>`).join('')}</tr>`).join('')
  const margin = Math.min(30, Math.max(5, Number(t.marginMm) || 14))
  const companyLogo = company?.logo ? `<img class="logo" src="${escape(company.logo)}" alt="Logo perusahaan">` : ''
  const companyBlock = t.showCompany && company ? `<div class="company">${companyLogo}<div><h2>${escape(company.legal_name || company.name)}</h2><p>${escape(company.address)}</p><p>${escape(company.phone)}${company.email ? ` · ${escape(company.email)}` : ''}</p><p>NPWP ${escape(company.tax_number)}</p></div></div>` : ''
  const styleClass = ['modern', 'classic', 'compact'].includes(t.templateStyle) ? t.templateStyle : 'modern'
  const signatureLabels = (Array.isArray(t.signatureLabels) ? t.signatureLabels : defaultPrintTemplate.signatureLabels).slice(0, 3)
  const paymentQr = t.showPaymentInfo && t.paymentQr ? `<img class="payment-qr" src="${escape(t.paymentQr)}" alt="QR pembayaran">` : ''
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escape(invoice.invoice_number)}</title><style>@page{size:${page} ${orientation};margin:${margin}mm;${t.showPageNumber ? '@bottom-right{content:"Halaman " counter(page) " / " counter(pages)}' : ''}}body{font:${font}pt Arial,sans-serif;color:#172033;margin:0;padding:24px;font-variant-numeric:tabular-nums;position:relative}h1{font-size:1.7em;color:${t.accentColor}}h2{font-size:1.3em;margin:0 0 4px}p{margin:5px 0}header{border-bottom:3px solid ${t.accentColor};padding-bottom:14px;margin-bottom:18px}.company{display:flex;gap:14px;align-items:flex-start}.logo{width:74px;height:74px;object-fit:contain}table{border-collapse:collapse;width:100%;margin:20px 0}th,td{padding:9px 6px;border-bottom:1px solid #dce1e8;text-align:left}thead{display:table-header-group;background:#f0f3f8}tr{break-inside:avoid}.number{text-align:right;white-space:nowrap}.totals{margin-left:auto;width:55%}.totals tr:last-child{color:${t.accentColor};font-size:1.08em}.signature{margin-top:48px;display:flex;justify-content:space-between}.signature span{display:block;padding-top:45px;border-bottom:1px solid #172033;width:32%;text-align:center}.payment{margin-top:18px;padding:12px;border-left:4px solid ${t.accentColor};background:#f8fafc;white-space:pre-wrap;display:flex;justify-content:space-between;gap:16px}.payment-qr{width:96px;height:96px;object-fit:contain;background:white}.watermark{position:fixed;inset:42% 0 auto;text-align:center;font-size:64pt;font-weight:bold;color:rgba(100,116,139,.12);transform:rotate(-25deg);z-index:-1}footer{margin-top:32px;border-top:1px solid #ddd;padding-top:12px;font-size:.85em;white-space:pre-wrap}.notes{white-space:pre-wrap}.classic header{text-align:center;border-bottom:1px double ${t.accentColor}}.classic .company{justify-content:center}.classic thead{background:transparent;border-top:2px solid #172033;border-bottom:2px solid #172033}.compact{font-size:${Math.max(8, font - 1)}pt}.compact header{margin-bottom:10px;padding-bottom:8px}.compact table{margin:10px 0}.compact th,.compact td{padding:5px 4px}@media print{body{padding:0}}</style></head><body class="${styleClass}">${t.watermark ? `<div class="watermark">${escape(t.watermark)}</div>` : ''}<header>${companyBlock}<h1>${escape(t.headerTitle || defaultTitle)}</h1><b>${escape(invoice.invoice_number)}</b></header><p>${escape(t.partnerLabel || defaultPartnerLabel)}: ${escape(invoice.supplier_name ?? invoice.customer_name)}</p><p>Tanggal: ${escape(invoice.invoice_date.slice(0, 10))} · Jatuh tempo: ${escape(invoice.due_date.slice(0, 10))}</p>${t.showReference ? `<p>Referensi: ${escape(invoice.reference ?? '—')}</p>` : ''}<table><thead><tr>${tableHead}</tr></thead><tbody>${tableRows}</tbody></table><table class="totals"><tr><td>Subtotal</td><td class="number">${money(invoice.subtotal)}</td></tr><tr><td>Diskon</td><td class="number">${money(invoice.discount)}</td></tr>${t.showTax ? `<tr><td>PPN / Pajak</td><td class="number">${money(invoice.tax)}</td></tr><tr><td>PPh dipotong</td><td class="number">${money(invoice.withholding_amount ?? 0)}</td></tr>` : ''}<tr><th>${escape(t.totalLabel || 'Total Tagihan')}</th><th class="number">${money(invoice.grand_total)}</th></tr></table>${t.paymentTerms ? `<div class="payment"><div><b>Syarat Pembayaran</b><br>${escape(t.paymentTerms)}</div></div>` : ''}${t.showPaymentInfo && (t.paymentInfo || paymentQr) ? `<div class="payment"><div><b>Informasi Pembayaran</b><br>${escape(t.paymentInfo)}</div>${paymentQr}</div>` : ''}${t.showNotes ? `<p class="notes">${escape(invoice.notes)}</p>` : ''}${t.showSignature ? `<div class="signature">${signatureLabels.map((label) => `<span>${escape(label)}</span>`).join('')}</div>` : ''}<footer>${escape(t.footer)}</footer></body></html>`
}
export async function printInvoice(invoice: PrintInvoice) {
  const documentType = invoice.supplier_name ? 'purchase_invoice' : 'sales_invoice'
  const data = (await api.get('/operations/print-template', { params: { document_type: documentType } })).data.data
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0'
  frame.title = 'Dokumen cetak'
  frame.onload = () => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    setTimeout(() => frame.remove(), 60000)
  }
  frame.srcdoc = documentHtml(invoice, data.template ?? defaultPrintTemplate, data.company)
  document.body.appendChild(frame)
}
export async function printOrder(order: Record<string, any>, purchase: boolean) {
  const documentType = purchase ? 'purchase_order' : 'sales_order'
  const data = (await api.get('/operations/print-template', { params: { document_type: documentType } })).data.data
  const printable: PrintInvoice = {
    document_label: purchase ? 'Purchase Order' : 'Sales Order',
    invoice_number: String(order.order_number), invoice_date: String(order.order_date),
    due_date: String(order.expected_date ?? order.order_date), currency: String(order.currency ?? 'IDR'),
    customer_name: purchase ? undefined : String(order.customer_name ?? ''),
    supplier_name: purchase ? String(order.supplier_name ?? '') : undefined,
    reference: purchase ? order.supplier_reference : order.reference, notes: order.notes,
    subtotal: order.subtotal, discount: order.discount, tax: order.tax, grand_total: order.grand_total,
    lines: (order.lines ?? []).map((line: Record<string, any>) => ({
      item_code: line.item_code, item_name: line.item_name, quantity: line.quantity,
      unit_code: line.unit_code, unit_price: line.unit_price, subtotal: line.subtotal,
      tax_amount: line.tax_amount ?? 0,
    })),
  }
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0'
  frame.title = 'Dokumen cetak'
  frame.onload = () => { frame.contentWindow?.focus(); frame.contentWindow?.print(); setTimeout(() => frame.remove(), 60000) }
  frame.srcdoc = documentHtml(printable, data.template ?? defaultPrintTemplate, data.company)
  document.body.appendChild(frame)
}
export const printSample: PrintInvoice = {
  invoice_number: 'PRATINJAU-2026-09-000001',
  invoice_date: '2026-09-28',
  due_date: '2026-10-28',
  currency: 'IDR',
  customer_name: 'Pelanggan Contoh',
  reference: 'PO-Contoh',
  notes: 'Contoh tampilan dokumen. Data ini tidak disimpan sebagai transaksi.',
  subtotal: 100000,
  discount: 0,
  tax: 11000,
  grand_total: 111000,
  lines: [
    {
      item_code: 'BRG-001',
      item_name: 'Barang contoh',
      quantity: 2,
      unit_code: 'pcs',
      unit_price: 50000,
      subtotal: 100000,
      tax_amount: 11000,
    },
  ],
}
