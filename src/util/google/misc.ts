import type { GaxiosError } from "gaxios"

/**
 * Whether Google failed on its own side (HTTP 5xx). Such failures are
 * transient — the same request may succeed if the user retries.
 */
export function isServerError(e: GaxiosError): boolean {
  return e.status != null && e.status >= 500
}

/**
 * Escape single quotes and backslashes in a string for use in a Google Drive query.
 * @param s - The string to escape.
 * @returns The escaped string.
 * @throws never
 */
export function escapeDriveQuery(s: string): string {
  return s.replace(/['\\]/g, "\\$&")
}
