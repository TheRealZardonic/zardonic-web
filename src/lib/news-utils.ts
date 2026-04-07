import { format } from 'date-fns'

/** Format a news date for display */
export function formatNewsDate(date: string): string {
  if (!date) return '---'
  const d = new Date(date)
  if (isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}$/.test(date)) {
      const [year, month] = date.split('-')
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
      return `${monthNames[parseInt(month) - 1]} ${year}`
    }
    return date
  }
  return format(d, 'dd.MM.yyyy')
}
