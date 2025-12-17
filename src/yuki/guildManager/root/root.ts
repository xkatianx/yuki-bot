// Set a root folder for a discord server.
// Every data of the server would be stored under the root folder.
// The bot will not store any data on its own,
// so the bot can be hosted across different computers.
// The root folder is set by pinning a message in any discord channel.

import type { Guild } from "discord.js"
import { warn } from "~misc/cli.js"
import { displayCode, formatString, parseString } from "~misc/format.js"
import { getPinned, PinFormat } from "~util/discord/util/pin.js"
import { MyError, MyErrorBase } from "~util/error/index.js"
import { AsyncResult, err, ok, result } from "~util/result/index.js"
import type { Yuki } from "../../yuki.js"
import { RootFolder } from "./rootFolder.js"

/**
 * Get the root folder url from the pinned message in the guild.
 * @param bot - The bot instance.
 * @param guild - The guild instance.
 * @returns The root folder url.
 */
export function getRootFolderUrl(bot: Yuki, guild: Guild) {
  return AsyncResult.from(async () => {
    const lastMessage = (await getPinned(guild, bot, PinFormat.Root)).pop()
    if (lastMessage == null)
      return err(
        RootError.new(
          RootErrorCode.MISSING_URL,
          `Unable to find root url in ${guild.toString()}.` +
            " Please use `/root {url}` to set one."
        )
      )

    bot.setLogChannel(guild.id, lastMessage.channel).unwrapOrElse(warn)

    const url = parseString(PinFormat.Root, lastMessage.message.content)?.get(
      "url"
    )
    if (url == null)
      return err(
        MyError.unexpected(
          "Wrong root url format in discord pinned message.",
          lastMessage
        )
      )
    return ok(url)
  })
}

/**
 * Set the root folder url by pinning a message in the guild.
 * This only returns the reply message, it does not pin the message.
 * @param url - The url of the root folder.
 * @returns The reply message.
 */
export function setRootFolderUrl(url: string) {
  return result
    .parseUrl(url)
    .map((url) => formatString(PinFormat.Root, { url: url.href }))
    .mapErr(() =>
      RootError.new(
        RootErrorCode.INVALID_URL,
        "Invalid URL:" + displayCode(url)
      )
    )
}

/**
 * Get the writable root folder from the pinned message in the guild.
 * @param bot - The bot instance.
 * @param guild - The guild instance.
 * @returns The writable root folder.
 */
export function getRootFolder(bot: Yuki, guild: Guild) {
  return getRootFolderUrl(bot, guild)
    .andThen((url) => RootFolder.fromUrl(url))
    .andThen((folder) => folder.checkWritePermission())
}

// /**
//  * Prepare the root folder and the settings spreadsheet.
//  * @param rootUrl - The url of the root folder.
//  * @returns The writable root folder and the unique settings spreadsheet.
//  */
// export function prepareRoot(rootUrl: string) {
//   return AsyncResult.from(RootFolder.fromUrl(rootUrl))
//     .andThen((root) => root.checkWritePermission())
//     .andThen((root) =>
//       getSettings(root).map((settings) => ({ root, settings }))
//     )
// }

// async function getSetting (bot: Bot, guild: Guild) {
//   const root = await getRootFolder(bot, guild)
// }

// async function removeRootFolder(bot: Bot, guild: Guild): Promise<void> {
//   const messages = await getPinned(bot, guild, PinFormat.Root);
//   await Promise.all(messages.map(async (m) => await m.delete()));
// }

export enum RootErrorCode {
  MISSING_URL,
  INVALID_URL,
}

export class RootError<T extends RootErrorCode> extends MyErrorBase<T> {
  private constructor(code: T, message: string) {
    super(code, message)
    this.name = "RootError"
  }

  static new<T extends RootErrorCode>(code: T, message: string): RootError<T> {
    return new RootError(code, message)
  }
}
