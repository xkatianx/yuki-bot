import type { Channel, Guild, TextChannel } from 'discord.js'
import {
  Ok,
  Err,
  Result,
  awaitedResult as asyncResult
} from '../../misc/result.js'
import { GFolder } from '../../gsheet/folder.js'
import { Cache } from '../../misc/cache.js'
import { GSpreadsheet } from '../../gsheet/gsheet.js'
import { ChannelManager } from './channelManager/channelManager.js'
import { Code, MyError, MyErrorCode, uid } from '../../error.js'
import { GDriveError, GDriveErrorCode } from '../../gsheet/error.js'
import { Yuki } from './yuki.js'
import { RootError, RootErrorCode } from './root.js'

export class Settings {
  /** name of the spreadsheet */
  static FILENAME = 'settings'
  spreadsheet: GSpreadsheet
  #table: any[][]
  #ready = false
  #cms = new Cache<ChannelManager>()
  private idx = {
    channelId: -1,
    folderId: -1,
    spreadsheetId: -1,
    channelName: -1,
    folderName: -1
  }

  constructor (spreadsheet: GSpreadsheet, table: any[][]) {
    ;(Object.keys(this.idx) as Array<keyof typeof this.idx>).forEach(key => {
      this.idx[key] = table.at(0)?.indexOf(key) ?? -1
    })
    this.spreadsheet = spreadsheet
    this.#table = table
    if (Object.values(this.idx).some(v => v < 0)) return
    this.#ready = true
  }

  static async newFromTemplate (rootFolder: GFolder) {
    const res1 = await GSpreadsheet.template.settings.copyTo(
      rootFolder,
      Settings.FILENAME
    )
    if (res1.isErr()) return res1
    const spreadsheet = res1.unwrap()
    return await Settings.fromSpreadsheet(spreadsheet)
  }

  static async fromSpreadsheet (spreadsheet: GSpreadsheet) {
    const index = await spreadsheet.readRange('INDEX!A:E')
    const settings = new Settings(spreadsheet, index)
    if (settings.#ready) return Ok(settings)
    return Err(
      SettingsError.new(
        SettingsErrorCode.CORRUPTED,
        'The settings spreadsheet is corrupted.'
      )
    )
  }

  getFolderId (channel: Channel) {
    const id = channel.id
    const row = this.#table.find(row => row[this.idx.channelId] === id)
    if (row != null) return Ok(String(row[this.idx.folderId]))
    return Err(
      SettingsError.new(
        SettingsErrorCode.MISSING_CHANNEL,
        `Unable to find channel \`${id}\`.`
      )
    )
  }

  getSpreadsheetId (channel: Channel) {
    const id = channel.id
    const row = this.#table.find(row => row[this.idx.channelId] === id)
    if (row != null) return Ok(String(row[this.idx.spreadsheetId]))
    return Err(
      SettingsError.new(
        SettingsErrorCode.MISSING_CHANNEL,
        `Unable to find channel \`${id}\`.`
      )
    )
  }

  async getChannelManager (channel: TextChannel) {
    return await this.#cms.getOrSet<
      | MyError<MyErrorCode>
      | SettingsError<SettingsErrorCode.MISSING_CHANNEL>
      | GDriveError<GDriveErrorCode.MISSING_TEXT>
    >(channel.id, async () => {
      const folderRes = this.getFolderId(channel).andThen(id =>
        Ok(new GFolder(id))
      )
      if (folderRes.isErr()) return folderRes
      const spreadsheetRes = this.getSpreadsheetId(channel).andThen(id =>
        Ok(new GSpreadsheet(id))
      )
      if (spreadsheetRes.isErr()) return spreadsheetRes
      return await this.setChannelManager(
        channel,
        folderRes.unwrap(),
        spreadsheetRes.unwrap()
      )
    })
  }

  async setChannelManager (
    channel: TextChannel,
    folder: GFolder,
    spreadsheet: GSpreadsheet
  ): Promise<
    Result<
      ChannelManager,
      MyError<MyErrorCode> | GDriveError<GDriveErrorCode.MISSING_TEXT>
    >
  > {
    return await (
      await folder.getName()
    ).andThenAsync(async folderName => {
      const arr = []
      arr[this.idx.channelId] = channel.id
      arr[this.idx.channelName] = channel.name
      arr[this.idx.folderId] = folder.id
      arr[this.idx.folderName] = folderName
      arr[this.idx.spreadsheetId] = spreadsheet.id

      const row = this.#table.findIndex(
        row => row[this.idx.channelId] === channel.id
      )
      if (row === -1) {
        this.#table.push(arr)
      } else {
        // TODO: maybe do something about the replaced one
        this.#table[row] = arr
      }
      return await MyError.try(async () => {
        await this.spreadsheet.writeRange('INDEX!A:E', this.#table).flushWrite()
        const cm = new ChannelManager(folder, spreadsheet)
        this.#cms.set(channel.id, cm)
        return Ok(cm)
      })
    })
  }
}

export enum SettingsErrorCode {
  CORRUPTED = uid(),
  MISSING_CHANNEL = uid()
}

export class SettingsError<T extends Code> extends MyError<T> {
  private constructor (code: T, message: string) {
    super(code, message)
    this.name = 'SettingsError'
  }

  static new<T extends SettingsErrorCode> (
    code: T,
    message: string
  ): SettingsError<T> {
    return new SettingsError(code, message)
  }
}

export async function getSettings (
  this: Yuki,
  guild: Guild
): Promise<
  Result<
    Settings,
    | GDriveError<GDriveErrorCode.CANNOT_WRITE | GDriveErrorCode.INVALID_URL>
    | SettingsError<SettingsErrorCode.CORRUPTED>
    | RootError<RootErrorCode.MISSING_URL>
    | MyError<MyErrorCode>
  >
> {
  return (
    await asyncResult(
      (
        await this.getRootFolder(guild)
      ).map(async root =>
        (await root.findSpreadsheet(Settings.FILENAME))
          .map(Settings.fromSpreadsheet)
          .unwrapOrElse(async e => {
            if (e.code !== GDriveErrorCode.MISSING_FILE) return Err(e)
            return await Settings.newFromTemplate(root)
          })
      )
    )
  ).unwrapOrElse(e => Err(e))
}
