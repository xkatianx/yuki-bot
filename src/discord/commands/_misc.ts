import {
  ChatInputCommandInteraction,
  Guild,
  Interaction,
  TextBasedChannel,
  TextChannel
} from 'discord.js'
import { fatal } from '../../misc/cli.js'
import { say } from '../error.js'
import { Yuki } from '../yuki/yuki.js'

export async function commandPrecheck (
  interaction: ChatInputCommandInteraction
): Promise<[Yuki, TextChannel]> {
  const bot = interaction.client.mybot
  if (bot == null) fatal('Missing yuki bot in the interaction.')
  const channel = await bot.client.channels.fetch(interaction.channelId)
  if (!(channel instanceof TextChannel)) {
    say('This command is not available in this channel.')
  }
  return [bot, channel]
}

export function interactionFetch (interaction: Interaction): {
  bot: Yuki
  channel: TextBasedChannel
  guild: Guild
} {
  const bot =
    interaction.client.mybot ?? fatal('Missing yuki bot in the interaction.')
  const channel =
    interaction.channel ?? say('This command is not available in this channel.')
  const guild =
    interaction.guild ?? say('This command is not available outside a guild.')
  return { bot, channel, guild }
}

export function fetchTextChannel (interaction: Interaction): TextChannel {
  if (interaction.channel instanceof TextChannel) return interaction.channel 
  say('This command is not available in this channel.')
}
