import type { GuildBasedChannel, Message } from "discord.js"
import { ChannelType, Guild } from "discord.js"
import { parseString } from "~misc/format.js"
import type { Bot } from "../bot.js"

export enum PinFormat {
  Root = "Root folder: {url}",
}

/**
 * Check if a message matches a pin format.
 * @param message - The message to check
 * @param format - The format to check
 * @returns True if the message matches the format, false otherwise
 * @throws never
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
 * @throws never
 */
export async function getPinned(
  guildOrChannel: Guild | GuildBasedChannel,
  bot: Bot,
  search?: PinFormat
) {
  let channels: GuildBasedChannel[]
  if (guildOrChannel instanceof Guild) {
    channels = [...guildOrChannel.channels.cache.values()]
  } else {
    channels = [guildOrChannel]
  }

  const pss = channels.map(async (channel) => {
    if (channel.type === ChannelType.GuildText) {
      try {
        const pinned = await channel.messages.fetchPins()
        return pinned.items.map((v) => ({
          message: v.message,
          pinnedTimestamp: v.pinnedTimestamp,
          channel: channel,
        }))
      } catch {
        return []
      }
    } else return []
  })
  const results = (await Promise.all(pss))
    .flat()
    .filter(
      (v) =>
        search == null ||
        (v.message.author.id === bot.client.user?.id &&
          isPinFormat(v.message, search))
    )
    .sort((a, b) => a.pinnedTimestamp - b.pinnedTimestamp)
  return results
}
