import { format, formatDistanceToNow } from 'date-fns'

/**
 * Shared formatting utilities for the SIEM dashboard.
 * Centralizes date/number formatting to ensure consistency across views.
 */

/**
 * Format a date as a relative time string (e.g., "3 minutes ago", "2 days ago").
 * Uses consistent options across the app.
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

/**
 * Format a date as a consistent datetime string.
 * Pattern: "MMM d, yyyy HH:mm:ss" — e.g. "Jan 15, 2024 14:30:00"
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM d, yyyy HH:mm:ss')
}

/**
 * Format a date as a short date string.
 * Pattern: "MMM d, yyyy" — e.g. "Jan 15, 2024"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM d, yyyy')
}

/**
 * Format a number with locale-aware grouping (commas in en-US).
 * e.g. 1234567 → "1,234,567"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString()
}
