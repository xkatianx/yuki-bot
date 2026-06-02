/**
 * Escape single quotes and backslashes in a string for use in a Google Drive query.
 * @param s - The string to escape.
 * @returns The escaped string.
 * @throws never
 */
export function escapeDriveQuery(s: string): string {
  return s.replace(/['\\]/g, "\\$&")
}
