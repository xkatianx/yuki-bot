// Set a root folder for a discord server.
// Every data of the server would be stored under the root folder.
// The mapping from guilds to root folders and logging channels is kept in
// the registry spreadsheet (`REGISTRY_SHEET_ID`), owned by the bot host,
// so the bot can still be hosted across different computers.

import { err, ok, result, TypedError } from "always-panic"
import type { Guild } from "discord.js"
import { warn } from "~misc/cli.js"
import { displayCode } from "~misc/format.js"
import MyBrowser from "~util/browser/browser.js"
import type { Yuki } from "../../yuki.js"
import { RegistrySheet } from "./registry/registrySheet.js"
import { RootFolder } from "./rootFolder.js"

/**
 * Get the root folder url of the guild from the registry spreadsheet.
 * Also sets the log channel of the guild from the registry entry.
 * @param bot - The bot instance.
 * @param guild - The guild instance.
 * @returns The root folder url.
 * @throws never
 */
export function getRootFolderUrl(bot: Yuki, guild: Guild) {
  return result.gen(async function* () {
    const sheet = yield* RegistrySheet.fromEnv()
    const entry = sheet.getEntry(guild.id)
    if (entry == null)
      return err(
        new RootError(
          RootErrorCode.MISSING_URL,
          `Unable to find root url in ${guild.toString()}.` +
            " Please use `/root {url}` to set one."
        )
      )
    const channel = guild.channels.cache.get(entry.loggingChannelId)
    if (channel != null) bot.setLogChannel(guild.id, channel).unwrapOrElse(warn)
    return ok(entry.rootUrl)
  })
}

/**
 * Save the root folder url and logging channel of a guild to the registry.
 * @param guild - The guild to save the entry for.
 * @param loggingChannelId - The ID of the logging channel.
 * @param rootUrl - The url of the root folder.
 * @returns The response from the spreadsheet.
 * @throws never
 */
export function saveRootUrlToRegistry(
  guild: Guild,
  loggingChannelId: string,
  rootUrl: string
) {
  return RegistrySheet.fromEnv().andThen((sheet) =>
    sheet.setEntry({
      guildId: guild.id,
      guildName: guild.name,
      rootUrl,
      loggingChannelId,
    })
  )
}

/**
 * Validate and normalize a root folder url.
 * @param url - The url of the root folder.
 * @returns The normalized url.
 * @throws never
 */
export function parseRootFolderUrl(url: string) {
  return MyBrowser.parseUrl(url)
    .map((url) => url.href)
    .mapErr(
      () =>
        new RootError(
          RootErrorCode.INVALID_URL,
          `Invalid URL: ${displayCode(url)}`
        )
    )
}

/**
 * Get the writable root folder of the guild from the registry spreadsheet.
 * @param bot - The bot instance.
 * @param guild - The guild instance.
 * @returns The writable root folder.
 * @throws never
 */
export function getRootFolder(bot: Yuki, guild: Guild) {
  return getRootFolderUrl(bot, guild)
    .andThen((url) => RootFolder.fromUrl(url))
    .andThen((folder) => folder.checkWritePermission())
}

export enum RootErrorCode {
  MISSING_URL,
  INVALID_URL,
}

export class RootError<T extends RootErrorCode> extends TypedError<T> {}
