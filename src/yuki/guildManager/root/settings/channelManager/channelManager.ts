import type { TextChannel } from "discord.js"
import { displayCode } from "~misc/format.js"
import type { GFolder } from "~util/google/folder/folder.js"
import { GSheetError, GSheetErrorCode } from "~util/google/sheet/error.js"
import { YukiBrowser } from "./browser/yukiBrowser.js"
import type { PuzzleSheet } from "./puzzle/puzzleSheet.js"

export class ChannelManager implements AsyncDisposable {
  async [Symbol.asyncDispose]() {
    await this.browser[Symbol.asyncDispose]()
  }

  protected constructor(
    public readonly channel: TextChannel,
    public readonly folder: GFolder,
    public readonly spreadsheet: PuzzleSheet,
    public readonly browser: YukiBrowser
  ) {}

  static from(channel: TextChannel, folder: GFolder, spreadsheet: PuzzleSheet) {
    return spreadsheet
      .readIndexInfo()
      .andThen((info) =>
        YukiBrowser.new(info.website).inspect(async (browser) => {
          await browser.login(info.username, info.password, info.website)
        })
      )
      .map(
        (browser) => new ChannelManager(channel, folder, spreadsheet, browser)
      )
  }

  toString(): string {
    return `ChannelManager(${this.channel.id})`
  }

  async scanTitle(url: string) {
    await this.browser.browse(url)
    return this.browser.getTitle()
  }

  appendRound(title: string) {
    return this.spreadsheet.newRound(title)
  }

  appendPuzzle(url: string, title: string) {
    return appendPuzzle(this.spreadsheet, url, title)
  }
}

/**
 * Append a puzzle tab to a spreadsheet, without needing a ChannelManager
 * (and therefore without a browser).
 */
export function appendPuzzle(
  spreadsheet: PuzzleSheet,
  url: string,
  title: string
) {
  return spreadsheet.newPuzzleTab(url, title).mapErr((e) => {
    if (GSheetError.is(e, GSheetErrorCode.DUPLICATE_SHEET)) {
      e.message = `${displayCode(title)} sheet already exists.`
    }
    return e
  })
}
