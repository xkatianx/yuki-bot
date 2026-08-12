import { err, ok } from "always-panic"
import { env } from "~misc/env.js"
import { GSheetError, GSheetErrorCode } from "~util/google/sheet/error.js"
import { GSpreadsheet } from "~util/google/sheet/sheet.js"
import {
  findEntry,
  type RegistryEntry,
  registryRange,
  upsertEntry,
} from "./registryUtil.js"

// The registry is a single spreadsheet owned by the bot host. It maps every
// guild to its root folder and logging channel, so on restart the bot finds
// them with one read instead of scanning pinned messages in every channel.
// ⚠️ Like the settings sheet, it is assumed that only this bot edits it.
export class RegistrySheet extends GSpreadsheet {
  protected constructor(
    id: string,
    protected table: unknown[][]
  ) {
    super(id)
  }

  /**
   * Get the registry configured by `REGISTRY_SHEET_ID`,
   * loading it on first use.
   * @returns The registry.
   * @throws never
   */
  static fromEnv() {
    loading ??= RegistrySheet.load(env.registrySheetId).inspectErr(() => {
      loading = null
    })
    return loading
  }

  /**
   * Read a spreadsheet as a registry.
   * An empty spreadsheet is a valid, empty registry.
   * @param id - The ID of the spreadsheet.
   * @returns The registry.
   * @throws never
   */
  static load(id: string) {
    return new GSpreadsheet(id)
      .readRange(registryRange)
      .orElse((e) =>
        GSheetError.is(e, GSheetErrorCode.NO_CONTENTS)
          ? ok([] as unknown[][])
          : err(e)
      )
      .map((table) => new RegistrySheet(id, table))
  }

  /**
   * Get the entry of a guild.
   * @param guildId - The ID of the guild.
   * @returns The entry, or null if the guild is not registered.
   * @throws never
   */
  getEntry(guildId: string): RegistryEntry | null {
    return findEntry(this.table, guildId)
  }

  /**
   * Insert or update the entry of a guild and write it to the spreadsheet.
   * @param entry - The entry to save.
   * @returns The response from the spreadsheet.
   * @throws never
   */
  setEntry(entry: RegistryEntry) {
    this.table = upsertEntry(this.table, entry)
    return this.writeRange(registryRange, this.table).flushWrite()
  }
}

/**
 * The bot has exactly one registry. This holds its in-flight or loaded
 * result so every caller shares the same instance; it is reset on failure
 * so the next call retries.
 */
let loading: ReturnType<typeof RegistrySheet.load> | null = null
