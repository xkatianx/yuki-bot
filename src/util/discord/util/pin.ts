import type { GuildBasedChannel, Message } from "discord.js"
import { ChannelType, Guild } from "discord.js"
import { parseString } from "~misc/format.js"
import type { Bot } from "../bot.js"

export enum PinFormat {
  Root = "Root folder: {url}",
}

function isPinFormat(message: Message, format: PinFormat): boolean {
  const res = parseString(format, message.content)
  return res != null
}

/** sorted from old to new */
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
