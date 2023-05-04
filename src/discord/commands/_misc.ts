import { ChatInputCommandInteraction, CacheType, TextChannel } from 'discord.js'
import { fatal } from '../../misc/cli.js'
import { say } from '../error.js'
import { Yuki } from '../yuki'

export async function commandPrecheck (
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<[Yuki, TextChannel]> {
  const bot = interaction.client.mybot
  if (bot == null) fatal('Missing yuki bot in the interaction.')
  const channel = await bot.client.channels.fetch(interaction.channelId)
  if (!(channel instanceof TextChannel)) {
    say('This command is not available in this channel.')
  }
  return [bot, channel]
}
