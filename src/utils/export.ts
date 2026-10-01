export function exportRows(name: string, columns: string[][], rows: Record<string, unknown>[]) {
  const escape = (value: unknown) => {
    let text = String(value ?? '')
    if (/^[=+@\t\r]/.test(text) || (/^-/.test(text) && !/^-\d+(\.\d+)?$/.test(text)))
      text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  const csv = [columns.map((c) => c[1]), ...rows.map((r) => columns.map((c) => r[c[0]!]))]
    .map((row) => row.map(escape).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
