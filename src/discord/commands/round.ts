import {
  CacheType,
  ChatInputCommandInteraction,
  SlashCommandBuilder
} from 'discord.js'
import { say } from '../error.js'
import { interactionFetch } from './_misc.js'

const data = new SlashCommandBuilder()
  .setName('round') // command here, should be the same as the file name
  .setDescription(
    'Add a new round title in the spreadsheet INDEX.'
  )
  .addStringOption(option =>
    option
      .setName('title')
      .setDescription('The round title to append.')
      .setRequired(true)
  )

async function execute (
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const { bot, channel } = interactionFetch(interaction)
  await interaction.deferReply()
  const ph = await bot.getPuzzlehuntFromSheet(channel, true)
  const title = interaction.options.getString('title') ?? say('Wrong input.')
  const name = await ph.appendRound(title)
  await interaction.editReply(`Round \`${name}\` added.`)
}

export default { data, execute }
