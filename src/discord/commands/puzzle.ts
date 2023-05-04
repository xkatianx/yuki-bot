import {
  CacheType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel
} from 'discord.js'
import { say } from '../error.js'

const data = new SlashCommandBuilder()
  .setName('puzzle')
  .setDescription(
    'Add new puzzle tab to the solving spreadsheet of this channel.'
  )
  .addStringOption(option =>
    option
      .setName('url')
      .setDescription('The url of the puzzle.')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('title')
      .setDescription(
        'The title of the puzzle. Default is the title of the given url.'
      )
  )

async function execute (
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  await interaction.deferReply()
  const bot = interaction.client.mybot
  const channel = await bot.client.channels.fetch(interaction.channelId)
  if (!(channel instanceof TextChannel)) {
    say('This command is not available in this channel.')
  }
  const ph = bot.getPuzzlehunt(channel.id) ??
    say('Puzzlehunt has not been set. Use /new first.')
  const url = interaction.options.getString('url') ?? say('Wrong input.')
  const title = interaction.options.getString('title') ?? undefined
  const tabName = await ph.appendPuzzle(url, title)
  await interaction.editReply(`"${tabName}" added.`)
}

export default { data, execute }
