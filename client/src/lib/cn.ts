export type ClassValue = string | false | null | undefined

/** Join truthy class names. */
export function cn(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(' ')
}
