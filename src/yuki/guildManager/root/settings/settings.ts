import { AsyncResult, err, result, TypedError } from "always-panic"
import type { TextChannel } from "discord.js"
import { Cache } from "~misc/cache.js"
import { env } from "~misc/env.js"
import { GFolderError, GFolderErrorCode } from "~util/google/folder/error.js"
import { GFolder } from "~util/google/folder/folder.js"
import { ChannelManager } from "./channelManager/channelManager.js"
import { PuzzleSheet } from "./channelManager/puzzle/puzzleSheet.js"
import { SettingsSheet } from "./settingsSheet.js"

export class Settings {
  // TODO: add a cleanup timer to the cache

  /** key = channel id */
  readonly #cms = new Cache<ChannelManager>()

  /**
   * Create a new settings instance.
   * @param spreadsheet - The spreadsheet of the settings.
   * @throws never
   */
  constructor(protected spreadsheet: SettingsSheet) {}

  async getChannelManager(channel: TextChannel) {
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
