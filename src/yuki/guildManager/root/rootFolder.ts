import { Cache } from "~misc/cache.js"
import { env } from "~misc/env.js"
import { GFolderError, GFolderErrorCode } from "~util/google/folder/error.js"
import { GFolder } from "~util/google/folder/folder.js"
import { err } from "~util/result/index.js"
import { Settings } from "./settings/settings.js"
import { SettingsSheet } from "./settings/settingsSheet.js"

export class RootFolder extends GFolder {
  private static readonly settingsMap = new Cache<Settings>()

  /**
   * Get the cached settings for the root folder,
   * or create one if it doesn't exist.
   * @returns The settings for the root folder.
   */
  async getSettings() {
    return RootFolder.settingsMap.getOrSet(this.id, () =>
      this.findUniqueSpreadsheet(env.settingsName)
        .andThen((spreadsheet) => SettingsSheet.fromSpreadsheet(spreadsheet))
        .orElse(async (e) =>
          e instanceof GFolderError &&
          e.code === GFolderErrorCode.MISSING_SPREADSHEET
            ? await SettingsSheet.newFromTemplate(this)
            : err(e)
        )
        .map((settingsSheet) => new Settings(settingsSheet))
    )
  }
}
