import { err, ok } from "always-panic"
import type { Channel, TextChannel } from "discord.js"
import { env } from "~misc/env.js"
import type { GFolder } from "~util/google/folder/folder.js"
import { GSpreadsheet } from "~util/google/sheet/sheet.js"
import type { PuzzleSheet } from "./channelManager/puzzle/puzzleSheet.js"
import util, {
  type GuildInfo,
  SettingsSheetError,
  SettingsSheetErrorCode,
} from "./settingsSheetUtil.js"

const indexCol = {
  channelId: 0,
  folderId: 1,
  spreadsheetId: 2,
  channelName: 3,
  folderName: 4,
} as const

// ⚠️ An important assumption is made that setting sheet is only managed
// by a single bot and no human will edit the sheet directly.
export class SettingsSheet extends GSpreadsheet {
  // private readonly cms = new Cache<ChannelManager>()
  protected guildInfo: Partial<GuildInfo> = {}

  /**
   * Create a new setting sheet.
   * @param id - The ID of the spreadsheet.
   * @param version - The version of the setting sheet.
   * @param table - The table of the setting sheet.
   * @param infos - The information in the setting sheet.
   * @throws never
   */
  protected constructor(
    id: string,
    protected version: (typeof util.validVersions)[number],
    protected table: unknown[][],
    public readonly infos: GuildInfo
  ) {
    super(id)
  }

  /**
   * Create a new setting sheet from the template
   * and copy it to the root folder.
   * @param rootFolder - The root folder to create the setting sheet in.
   * @returns The setting sheet.
   * @throws never
   */
  static newFromTemplate(rootFolder: GFolder) {
    return new GSpreadsheet(env.settingsId)
      .copyTo(rootFolder, env.settingsName)
      .andThen(SettingsSheet.fromSpreadsheet)
  }

  /**
   * Read a spreadsheet as a setting sheet.
   * @param spreadsheet - The spreadsheet object to read as a setting sheet.
   * @returns The setting sheet.
   * @throws never
   */
  static fromSpreadsheet(this: void, spreadsheet: GSpreadsheet) {
    return util
      .getVersion(spreadsheet)
      .andThen((version) => util.getInfo(spreadsheet, version))
      .map(
        ({ table, infos, version }) =>
          new SettingsSheet(spreadsheet.id, version, table, infos)
      )
  }

  /**
   * Set the guild information in the setting sheet.
   * @param info - The guild information to set.
   * @returns The updated guild information.
   */
  setGuildInfo(info: Partial<GuildInfo>) {
    return util.setInfo.call(this, this.version, info)
  }

  /**
   * Get the folder ID for a channel.
   * @param channel - The channel to get the folder ID for.
   * @returns The folder ID.
   * @throws never
   */
  getFolderId(channel: Channel) {
    const id = channel.id
    const row = this.table.find((row) => row[indexCol.channelId] === id)
    if (row != null) return ok(String(row[indexCol.folderId]))
    return err(
      new SettingsSheetError(
        SettingsSheetErrorCode.MISSING_CHANNEL,
        `Unable to find channel \`${id}\`.` +
          " Please use `/new <url>` to set one."
      )
    )
  }

  /**
   * Get the spreadsheet ID for a channel.
   * @param channel - The channel to get the spreadsheet ID for.
   * @returns The spreadsheet ID.
   * @throws never
   */
  getSpreadsheetId(channel: Channel) {
    const id = channel.id
    const row = this.table.find((row) => row[indexCol.channelId] === id)
    if (row != null) return ok(String(row[indexCol.spreadsheetId]))
    return err(
      new SettingsSheetError(
        SettingsSheetErrorCode.MISSING_CHANNEL,
        `Unable to find channel \`${id}\`.` +
          " Please use `/new <url>` to set one."
      )
    )
  }

  updateChannel(
    channel: TextChannel,
    folder: GFolder,
    spreadsheet: PuzzleSheet
  ) {
    return folder.getName().andThen((folderName) => {
      const arr = []
      arr[indexCol.channelId] = channel.id
      arr[indexCol.channelName] = channel.name
      arr[indexCol.folderId] = folder.id
      arr[indexCol.folderName] = folderName
      arr[indexCol.spreadsheetId] = spreadsheet.id

      const row = this.table.findIndex(
        (row) => row[indexCol.channelId] === channel.id
      )
      if (row === -1) {
        this.table.push(arr)
      } else {
        // TODO: maybe do something about the replaced one
        this.table[row] = arr
      }
      return this.writeRange("INDEX!A:E", this.table).flushWrite()
    })
  }
}
