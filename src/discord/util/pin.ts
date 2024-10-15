import { Guild, GuildBasedChannel, Message, ChannelType } from "discord.js";
import { Bot } from "../bot.js";
import { formatArgument } from "../../misc/format.js";

/** sorted from old to new */
export async function getPinned(
  bot: Bot,
  guildOrChannel: Guild | GuildBasedChannel,
  searchFormat?: string
): Promise<Message[]> {
  let channels: GuildBasedChannel[];
  if (guildOrChannel instanceof Guild) {
    channels = [...guildOrChannel.channels.cache.values()];
  } else {
    channels = [guildOrChannel];
  }

  const tasks = channels.map(async (channel) => {
    if (channel.type === ChannelType.GuildText) {
      try {
        const pinned = await channel.messages.fetchPinned(true);
        return [...pinned.values()];
      } catch (_) {
        return null;
      }
    } else return null;
  });

  const results = (await Promise.all(tasks))
    .flat()
    .filter((v): v is Message<true> => v != null)
    .filter(
      (v) =>
        searchFormat == null ||
        (v.author.id === bot.client.user?.id &&
          formatArgument(v.content, searchFormat) != null)
    )
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  return results;
}
