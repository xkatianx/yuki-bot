import { TextChannel } from 'discord.js'
import { say } from '../error.js'
import { newSlashCommand } from './_main.js'

export default newSlashCommand(
  'stats',
  'Show a brief summary of the puzzlehunt progress.',
  async interaction => {
    await interaction.deferReply()
    const bot = interaction.client.mybot
    const channel = interaction.channel
    if (!(channel instanceof TextChannel)) {
      say('This command is not available in this channel.')
    }
    const sheet =
      (await bot.getSheet(channel)) ??
      say('There is no sheet in this channel.\nPlease use /setsheet first.')
    const stat = await sheet.puzzlehunt.getStat()
    return await interaction.editReply(stat)
  }
)
