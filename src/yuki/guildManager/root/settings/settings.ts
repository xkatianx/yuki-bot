import type { TextChannel } from "discord.js"
import { Cache } from "~misc/cache.js"
import { env } from "~misc/env.js"
import { MyErrorBase } from "~util/error/index.js"
import { GFolderError, GFolderErrorCode } from "~util/google/folder/error.js"
import { GFolder } from "~util/google/folder/folder.js"
import { AsyncResult, err, result } from "~util/result/index.js"
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

  setChannelManager(
    channel: TextChannel,
    folder: GFolder,
    spreadsheet: PuzzleSheet
  ) {
    return this.spreadsheet
      .updateChannel(channel, folder, spreadsheet)
      .andThen(() => ChannelManager.from(channel, folder, spreadsheet))
      .inspect(async (cm) => {
        await using _old = this.#cms.set(channel.id, cm)
      })
  }
}

export enum SettingsErrorCode {
  CORRUPTED,
  MISSING_CHANNEL,
}

export class SettingsError<T extends SettingsErrorCode> extends MyErrorBase<T> {
  private constructor(code: T, message: string) {
    super(code, message)
    this.name = "SettingsError"
  }

  static new<T extends SettingsErrorCode>(
    code: T,
    message: string
  ): SettingsError<T> {
    return new SettingsError(code, message)
  }
}

export function getSettings(root: GFolder) {
  return root
    .findUniqueSpreadsheet(env.settingsName)
    .andThen((spreadsheet) => SettingsSheet.fromSpreadsheet(spreadsheet))
    .orElse(async (e) =>
      e instanceof GFolderError &&
      e.code === GFolderErrorCode.MISSING_SPREADSHEET
        ? await SettingsSheet.newFromTemplate(root)
        : err(e)
    )
}
