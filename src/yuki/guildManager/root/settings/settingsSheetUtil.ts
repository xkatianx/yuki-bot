import { noDefault } from "~misc/type.js"
import { MyError, MyErrorBase } from "~util/error/index.js"
import type { GSpreadsheet } from "~util/google/sheet/sheet.js"
import { err, ok, type AsyncResult } from "~util/result/index.js"
import type { SettingsSheet } from "./settingsSheet.js"

export interface GuildInfo {
  guildId: string
  guildName: string
  defaultUsername: string
  defaultPassword: string
  announcingChannelID: string
  loggingChannelID: string
}

const validVersions = ["1.0.0"] as const

/**
 * Get the version of the setting sheet.
 * @returns The version.
 */
function getVersion(sheet: GSpreadsheet) {
  return sheet.readRange("version").andThen((arr) => {
    const ver = arr[0]?.[0]
    // @ts-expect-error - ignored. `includes` accepts any type
    if (validVersions.includes(ver))
      return ok(ver as (typeof validVersions)[number])
    return err(
      SettingsSheetError.new(
        SettingsSheetErrorCode.UNKNOWN_VERSION,
        `Unknown version: ${JSON.stringify(ver)}`
      )
    )
  })
}

function getInfo_1_0_0(sheet: GSpreadsheet) {
  return sheet
    .readRanges([
      "INDEX!A:E",
      "guildId",
      "guildName",
      "defaultUsername",
      "defaultPassword",
      "announcingChannelID",
      "loggingChannelID",
    ])
    .map((arr) => {
      const a = arr.slice(1).map((res) => String(res.values?.[0]?.[0] ?? ""))
      return {
        table: arr[0]?.values,
        infos: {
          guildId: a[0] ?? "",
          guildName: a[1] ?? "",
          defaultUsername: a[2] ?? "",
          defaultPassword: a[3] ?? "",
          announcingChannelID: a[4] ?? "",
          loggingChannelID: a[5] ?? "",
        },
      }
    })
    .andThen(({ table, infos }) => {
      if (table == null)
        return err(MyError.unexpected("Unable to read INDEX!A:E", sheet))
      return ok({
        table: table as unknown[][],
        infos,
        version: "1.0.0" as const,
      })
    })
}

function getInfo(sheet: GSpreadsheet, version: (typeof validVersions)[number]) {
  return (() => {
    switch (version) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      case "1.0.0":
        return getInfo_1_0_0(sheet)
      default:
        noDefault(version)
    }
  })() satisfies AsyncResult<{ version: typeof version }, unknown>
}

/**
 * @see SettingsSheet.setGuildInfo
 */
function setInfo_1_0_0(this: SettingsSheet, info: Partial<GuildInfo>) {
  Object.entries(info).forEach(([k, v]) => {
    this.writeCell(k, v)
  })
  return this.flushWrite().map(() => {
    this.guildInfo = {
      ...this.guildInfo,
      ...info,
    }
    return this.guildInfo
  })
}

/**
 * @see SettingsSheet.setGuildInfo
 */
function setInfo(
  this: SettingsSheet,
  version: (typeof validVersions)[number],
  info: Partial<GuildInfo>
) {
  switch (version) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    case "1.0.0":
      return setInfo_1_0_0.call(this, info)
    default:
      noDefault(version)
  }
}

export default {
  getVersion,
  validVersions,
  getInfo,
  setInfo,
}

export enum SettingsSheetErrorCode {
  UNKNOWN_VERSION,
  CORRUPTED,
  MISSING_CHANNEL,
}

export class SettingsSheetError<
  T extends SettingsSheetErrorCode,
> extends MyErrorBase<T> {
  constructor(code: T, message: string) {
    super(code, message)
    this.name = "SettingSheetError"
  }

  static new<T extends SettingsSheetErrorCode>(
    code: T,
    message: string
  ): SettingsSheetError<T> {
    return new SettingsSheetError(code, message)
  }
}
