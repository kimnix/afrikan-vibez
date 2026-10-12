/** Format a minor-unit amount (e.g. pence) as a localised currency string. */
export function formatMoney(
  minor: number,
  currency: string,
  locale = 'en-GB',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(minor / 100)
}

/** Long date in the event's timezone, e.g. "Sunday 18 July 2027". */
export function formatEventDate(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date(iso))
}

/** Short date in the event's timezone, e.g. "18 Jul 2027". */
export function formatShortDate(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date(iso))
}

/** Time in the event's timezone, e.g. "16:00". */
export function formatEventTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(iso))
}

/** Readable timezone label, e.g. "GMT+1". */
export function timezoneLabel(iso: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).formatToParts(new Date(iso))
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? timezone
}
