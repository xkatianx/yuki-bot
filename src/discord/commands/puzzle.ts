import {
  CacheType,
  ChatInputCommandInteraction,
  SlashCommandBuilder
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
        'The title of the puzzle, used as the sheet tab name.'
      )
      .setRequired(true)
  )

async function execute (
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  await interaction.deferReply()
  const bot = interaction.client.mybot
  const channel = interaction.channel ??
    say('Unable to get the interacting channel.')
  const ph = await bot.getPuzzlehuntFromSheet(channel, true)
  const url = interaction.options.getString('url') ?? say('Wrong input.')
  const title = interaction.options.getString('title') ?? undefined
  const tabName = await ph.appendPuzzle(url, title)
  await interaction.editReply(`"${tabName}" added.`)
}

export default { data, execute }
