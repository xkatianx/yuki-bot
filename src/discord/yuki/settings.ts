import type { Channel, Guild, TextChannel } from "discord.js";
import { Ok, Err, asResult, asResultFn } from "../../misc/result.js";
import { GFolder } from "../../google/folder.js";
import { Cache } from "../../misc/cache.js";
import { GSpreadsheet } from "../../google/spreadsheet.js";
import { ChannelManager } from "./channelManager/channelManager.js";
import { type Code, MyError, uid } from "../../error.js";
import { GDriveErrorCode } from "../../google/error.js";
import { type Yuki } from "./yuki.js";

export class Settings {
  /** name of the spreadsheet */
  static FILENAME = "settings";
  spreadsheet: GSpreadsheet;
  #table: unknown[][];
  #ready = false;
  readonly #cms = new Cache<ChannelManager>();
  private idx = {
    channelId: -1,
    folderId: -1,
    spreadsheetId: -1,
    channelName: -1,
    folderName: -1,
  };

  constructor(spreadsheet: GSpreadsheet, table: unknown[][]) {
    (Object.keys(this.idx) as Array<keyof typeof this.idx>).forEach((key) => {
      this.idx[key] = table.at(0)?.indexOf(key) ?? -1;
    });
    this.spreadsheet = spreadsheet;
    this.#table = table;
    if (Object.values(this.idx).some((v) => v < 0)) return;
    this.#ready = true;
  }

  static async newFromTemplate(rootFolder: GFolder) {
    const res1 = await GSpreadsheet.template.settings.copyTo(
      rootFolder,
      Settings.FILENAME
    );
    if (res1.isErr()) return res1;
    const spreadsheet = res1.unwrap();
    return await Settings.fromSpreadsheet(spreadsheet);
  }

  static async fromSpreadsheet(spreadsheet: GSpreadsheet) {
    const index = await spreadsheet.readRange("INDEX!A:E");
    const settings = new Settings(spreadsheet, index);
    if (settings.#ready) return Ok(settings);
    return Err(
      SettingsError.new(
        SettingsErrorCode.CORRUPTED,
        "The settings spreadsheet is corrupted."
      )
    );
  }

  getFolderId(channel: Channel) {
    const id = channel.id;
    const row = this.#table.find((row) => row[this.idx.channelId] === id);
    if (row != null) return Ok(String(row[this.idx.folderId]));
    return Err(
      SettingsError.new(
        SettingsErrorCode.MISSING_CHANNEL,
        `Unable to find channel \`${id}\`.`
      )
    );
  }

  getSpreadsheetId(channel: Channel) {
    const id = channel.id;
    const row = this.#table.find((row) => row[this.idx.channelId] === id);
    if (row != null) return Ok(String(row[this.idx.spreadsheetId]));
    return Err(
      SettingsError.new(
        SettingsErrorCode.MISSING_CHANNEL,
        `Unable to find channel \`${id}\`.`
      )
    );
  }

  async getChannelManager(channel: TextChannel) {
    return await this.#cms.getOrSet(channel.id, async () =>
      asResultFn(async () => {
        const folderRes = this.getFolderId(channel).andThen((id) =>
          Ok(new GFolder(id))
        );
        if (folderRes.isErr()) return folderRes;
        const spreadsheetRes = this.getSpreadsheetId(channel).andThen((id) =>
          Ok(new GSpreadsheet(id))
        );
        if (spreadsheetRes.isErr()) return spreadsheetRes;
        return await this.setChannelManager(
          channel,
          folderRes.unwrap(),
          spreadsheetRes.unwrap()
        );
      })
    );
  }

  async setChannelManager(
    channel: TextChannel,
    folder: GFolder,
    spreadsheet: GSpreadsheet
  ) {
    return asResult(
      await (
        await folder.getName()
      ).andThenAsync(async (folderName) => {
        const arr = [];
        arr[this.idx.channelId] = channel.id;
        arr[this.idx.channelName] = channel.name;
        arr[this.idx.folderId] = folder.id;
        arr[this.idx.folderName] = folderName;
        arr[this.idx.spreadsheetId] = spreadsheet.id;

        const row = this.#table.findIndex(
          (row) => row[this.idx.channelId] === channel.id
        );
        if (row === -1) {
          this.#table.push(arr);
        } else {
          // TODO: maybe do something about the replaced one
          this.#table[row] = arr;
        }
        return await MyError.try(async () => {
          await this.spreadsheet
            .writeRange("INDEX!A:E", this.#table)
            .flushWrite();
          const cm = new ChannelManager(folder, spreadsheet);
          this.#cms.set(channel.id, cm);
          return Ok(cm);
        });
      })
    );
  }
}

export enum SettingsErrorCode {
  CORRUPTED = uid(),
  MISSING_CHANNEL = uid(),
}

export class SettingsError<T extends Code> extends MyError<T> {
  private constructor(code: T, message: string) {
    super(code, message);
    this.name = "SettingsError";
  }

  static new<T extends SettingsErrorCode>(
    code: T,
    message: string
  ): SettingsError<T> {
    return new SettingsError(code, message);
  }
}

export async function getSettings(this: Yuki, guild: Guild) {
  return asResult(
    await (
      await this.getRootFolder(guild)
    ).andThenAsync(async (root) =>
      asResult(
        await (
          await root.findSpreadsheet(Settings.FILENAME)
        ).andThenAsync((spreadsheet) => Settings.fromSpreadsheet(spreadsheet))
      ).orElseAsync(async (e) => {
        switch (e.code) {
          case GDriveErrorCode.MISSING_FILE:
            return await Settings.newFromTemplate(root);
          default:
            return Err(e);
        }
      })
    )
  );
}
