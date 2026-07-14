/**
 * Export utility functions for SIEM data.
 * Converts data arrays to CSV or JSON format and triggers browser download.
 */

export type ExportFormat = 'csv' | 'json'

interface ExportOptions {
  filename: string
  format: ExportFormat
  data: Record<string, unknown>[]
}

/**
 * Flatten a nested object to a single-level object with dot-notation keys.
 * e.g. { user: { name: 'Alice' } } → { 'user.name': 'Alice' }
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value as Record<string, unknown>, newKey, result)
    } else if (Array.isArray(value)) {
      result[newKey] = value.map(String).join('; ')
    } else {
      result[newKey] = value
    }
  }
  return result
}

/**
 * Export data as CSV and trigger a browser download.
 */
function exportAsCSV(filename: string, data: Record<string, unknown>[]): void {
  if (!data.length) return

  // Flatten all rows and collect headers
  const flatRows = data.map((row) => flattenObject(row))
  const headers = Array.from(
    new Set(flatRows.flatMap((row) => Object.keys(row)))
  )

  // Build CSV content
  const csvRows: string[] = []

  // Header row
  csvRows.push(headers.map(escapeCSVField).join(','))

  // Data rows
  for (const row of flatRows) {
    const values = headers.map((h) => {
      const val = row[h]
      return escapeCSVField(val == null ? '' : String(val))
    })
    csvRows.push(values.join(','))
  }

  const csvContent = csvRows.join('\n')
  downloadBlob(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;')
}

/**
 * Export data as JSON and trigger a browser download.
 */
function exportAsJSON(filename: string, data: Record<string, unknown>[]): void {
  const jsonContent = JSON.stringify(data, null, 2)
  downloadBlob(jsonContent, `${filename}.json`, 'application/json;charset=utf-8;')
}

/**
 * Escape a CSV field — wrap in double quotes if it contains commas, quotes, or newlines.
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

/**
 * Create a Blob from content, create an object URL, and trigger download.
 */
function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()

  // Cleanup after a short delay to ensure the download starts
  setTimeout(() => {
    URL.revokeObjectURL(url)
    document.body.removeChild(link)
  }, 100)
}

/**
 * Main export function — converts data to the specified format and downloads it.
 */
export function exportData({ filename, format, data }: ExportOptions): void {
  switch (format) {
    case 'csv':
      exportAsCSV(filename, data)
      break
    case 'json':
      exportAsJSON(filename, data)
      break
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}
