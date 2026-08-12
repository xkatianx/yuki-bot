import { AsyncResult, err, result, TypedError } from "always-panic"
import type { TextChannel } from "discord.js"
import { Cache } from "~misc/cache.js"
import { env } from "~misc/env.js"
import { DAY } from "~misc/time/ms.js"
import { GFolderError, GFolderErrorCode } from "~util/google/folder/error.js"
import { GFolder } from "~util/google/folder/folder.js"
import { ChannelManager } from "./channelManager/channelManager.js"
import { PuzzleSheet } from "./channelManager/puzzle/puzzleSheet.js"
import { SettingsSheet } from "./settingsSheet.js"

/** Dispose channel managers (and their browser contexts) idle for this long. */
const IDLE_TTL_MS = 1 * DAY
/** How often to sweep for idle channel managers. */
const SWEEP_INTERVAL_MS = 1 * DAY

export class Settings {
  /** key = channel id */
  readonly #cms = new Cache<ChannelManager>()
  /** key = channel id, value = when the manager was last requested */
  readonly #lastUsed = new Map<string, number>()

  /**
   * Create a new settings instance.
   * @param spreadsheet - The spreadsheet of the settings.
   * @throws never
   */
  constructor(protected spreadsheet: SettingsSheet) {
    // unref: the sweeper must not keep the process alive on shutdown.
    setInterval(() => void this.#sweepIdle(), SWEEP_INTERVAL_MS).unref()
  }

  /** Dispose channel managers that have not been requested for a while. */
  async #sweepIdle() {
    const deadline = Date.now() - IDLE_TTL_MS
    for (const [id, at] of this.#lastUsed) {
      if (at > deadline) continue
      this.#lastUsed.delete(id)
      await using _cm = this.#cms.reset(id)
    }
  }

  async getChannelManager(channel: TextChannel) {
    // A cached manager whose Chrome context has died (e.g. the shared
    // browser was OOM-killed) can never recover; drop it so a fresh
    // context is created.
    const cached = this.#cms.get(channel.id)
    if (cached != null && !cached.browser.connected)
      await this.resetChannelManager(channel)
    this.#lastUsed.set(channel.id, Date.now())
    return this.#cms.getOrSet(channel.id, () =>
      AsyncResult.from(
        result.all([
          this.spreadsheet.getFolderId(channel),
          this.spreadsheet.getSpreadsheetId(channel),
        ])
      ).andThen(([folderId, spreadsheetId]) =>
        this.setChannelManager(
          channel,
          new GFolder(folderId),
          new PuzzleSheet(spreadsheetId)
        )
      )
    )
  }

  /**
   * Drop the cached channel manager for the channel and dispose its browser.
   * The next `getChannelManager` will rebuild it from scratch.
   */
  async resetChannelManager(channel: TextChannel) {
    this.#lastUsed.delete(channel.id)
    await using _cm = this.#cms.reset(channel.id)
  }

  /**
   * Get the puzzle spreadsheet of the channel without creating a
   * ChannelManager, so no browser is launched.
   */
  getPuzzleSheet(channel: TextChannel) {
    return this.spreadsheet
      .getSpreadsheetId(channel)
      .map((id) => new PuzzleSheet(id))
  }

  setChannelManager(
    channel: TextChannel,
    folder: GFolder,
    spreadsheet: PuzzleSheet
  ) {
    return this.spreadsheet
      .updateChannel(channel, folder, spreadsheet)
      .andThen(() => ChannelManager.from(channel, folder, spreadsheet))
      .map(async (cm) => {
        this.#lastUsed.set(channel.id, Date.now())
        await using _old = this.#cms.set(channel.id, cm)
        return cm
      })
  }
}

export enum SettingsErrorCode {
  CORRUPTED,
  MISSING_CHANNEL,
}

export class SettingsError<T extends SettingsErrorCode> extends TypedError<T> {}

export function getSettings(root: GFolder) {
  return root
    .findUniqueSpreadsheet(env.settingsName)
    .andThen((spreadsheet) => SettingsSheet.fromSpreadsheet(spreadsheet))
    .orElse(async (e) =>
      GFolderError.is(e, GFolderErrorCode.MISSING_SPREADSHEET)
        ? await SettingsSheet.newFromTemplate(root)
        : err(e)
    )
}
