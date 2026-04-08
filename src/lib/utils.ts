import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses a gig date string into a local-midnight Date.
 *
 * ISO date-only strings (YYYY-MM-DD) are parsed as **local** midnight to avoid
 * the UTC-offset skew that `new Date("2026-04-24")` introduces: the JS Date
 * constructor interprets date-only ISO 8601 strings as UTC, which can shift the
 * date to the previous calendar day in timezones behind UTC.
 *
 * Datetime strings (containing "T" or time info) are passed through normally.
 */
export function parseGigDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(dateStr)
}
