import { AsyncResult, err, ok, result, UnexpectedError } from "always-panic"
import type { GuildBasedChannel, Message, TextBasedChannel } from "discord.js"
import { ChannelType, Guild } from "discord.js"
import { parseString } from "~misc/format.js"
import type { Bot } from "../bot.js"
import { DiscordError, DiscordErrorCode } from "../error.js"

export enum PinFormat {
  Root = "Root folder: {url}",
}

/**
 * Check if a message matches a pin format.
 * @param message - The message to check
 * @param format - The format to check
 * @returns True if the message matches the format, false otherwise
 */
function isPinFormat(message: Message, format: PinFormat): boolean {
  try {
    const res = parseString(format, message.content)
    return res != null
  } catch {
    return false
  }
}

/**
 * Get the pinned messages from a bot from a guild or channel.
 * @param guildOrChannel - The guild or channel to get the pinned messages from
 * @param bot - The bot to get the pinned messages from
 * @param search - The format to search for
 * @returns The pinned messages, sorted from old to new
 */
export function getPinned(
  guildOrChannel: Guild | GuildBasedChannel,
  bot: Bot,
  search?: PinFormat
) {
  let channels: GuildBasedChannel[]
  if (guildOrChannel instanceof Guild) {
    // NOTE: this includes every channel
    channels = [...guildOrChannel.channels.cache.values()]
  } else {
    channels = [guildOrChannel]
  }

  const pss = channels
    .filter(
      (v): v is TextBasedChannel & GuildBasedChannel =>
        v.type === ChannelType.GuildText &&
        v.lastPinTimestamp != null &&
        v.lastPinTimestamp > 0
    )
    .map((channel) =>
      fetchPins(channel)
        .map((res) =>
          res.items.map((v) => ({
            message: v.message,
            pinnedTimestamp: v.pinnedTimestamp,
            channel: channel,
          }))
        )
        .orElse((e) => {
          if (
            e instanceof DiscordError &&
            e.code === DiscordErrorCode.NO_ACCESS_FETCH_PINS
          ) {
            return ok([])
          }
          return err(e)
        })
    )

  return AsyncResult.merge(pss).map((arr) =>
    arr
      .flat()
      .filter(
        (v) =>
          search == null ||
          (v.message.author.id === bot.client.user?.id &&
            isPinFormat(v.message, search))
      )
      .sort((a, b) => a.pinnedTimestamp - b.pinnedTimestamp)
  )
}

/**
 * Pin a message.
 * @param channel - The channel to pin the message in
 * @param message - The message to pin
 */
export function pin(channel: TextBasedChannel, message: Message) {
  return DiscordError.try(async () => {
    await channel.messages.pin(message)
    return ok(undefined)
  })
}

function fetchPins(channel: TextBasedChannel) {
  return result.panic(
    DiscordError.try(async () => {
      const pinned = await channel.messages.fetchPins()
      return ok(pinned)
    }).mapErr((e) => {
      if (e instanceof DiscordError) {
        if (e.code === DiscordErrorCode.NO_ACCESS) {
          return DiscordError.noAccessFetchPins(e.info.cause)
        } else {
          return UnexpectedError.unreachable()
        }
      }
      return e
    })
  )
}
