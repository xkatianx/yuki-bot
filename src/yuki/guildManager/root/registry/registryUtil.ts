/** One row in the registry spreadsheet, keyed by guild id. */
export interface RegistryEntry {
  guildId: string
  guildName: string
  rootUrl: string
  loggingChannelId: string
}

const indexCol = {
  guildId: 0,
  guildName: 1,
  rootUrl: 2,
  loggingChannelId: 3,
} as const

/** The range covering the registry table in the first sheet. */
export const registryRange = "A:D"

const header = ["guildId", "guildName", "rootUrl", "loggingChannelId"]

/**
 * Find the entry of a guild in the registry table.
 * @param table - The registry table, including the header row.
 * @param guildId - The ID of the guild to find.
 * @returns The entry, or null if the guild is not in the table
 * or its root url is empty.
 * @throws never
 */
export function findEntry(
  table: unknown[][],
  guildId: string
): RegistryEntry | null {
  const row = table.find((row) => row[indexCol.guildId] === guildId)
  if (row == null) return null
  const rootUrl = String(row[indexCol.rootUrl] ?? "")
  if (rootUrl === "") return null
  return {
    guildId,
    guildName: String(row[indexCol.guildName] ?? ""),
    rootUrl,
    loggingChannelId: String(row[indexCol.loggingChannelId] ?? ""),
  }
}

/**
 * Insert or update the entry of a guild in the registry table.
 * A header row is added when the table is empty.
 * @param table - The registry table, including the header row.
 * @param entry - The entry to insert or update.
 * @returns The same table, updated in place.
 * @throws never
 */
export function upsertEntry(
  table: unknown[][],
  entry: RegistryEntry
): unknown[][] {
  if (table.length === 0) table.push([...header])
  const arr = []
  arr[indexCol.guildId] = entry.guildId
  arr[indexCol.guildName] = entry.guildName
  arr[indexCol.rootUrl] = entry.rootUrl
  arr[indexCol.loggingChannelId] = entry.loggingChannelId

  const row = table.findIndex((row) => row[indexCol.guildId] === entry.guildId)
  if (row === -1) {
    table.push(arr)
  } else {
    table[row] = arr
  }
  return table
}
