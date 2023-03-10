import {
  CacheType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel
} from 'discord.js'
import { Gsheet } from '../../gsheet/gsheet.js'
import { say } from '../error.js'

const data = new SlashCommandBuilder()
  .setName('sheet')
  .setDescription('Set the solving spreadsheet for this channel.')
  .addStringOption(option =>
    option
      .setName('url')
      .setDescription('The url of the spreadsheet.')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('force')
      .setDescription('Enter "force" to replace the old one.')
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
  const oldSheet = await bot.getSheet(channel)
  if (oldSheet != null) {
    if (interaction.options.getString('force') !== 'force') {
      say('Sheet was already set. Add "force" to change it.')
    }
    // TODO delete old sheet pin
  }
  const newUrl =
    interaction.options.getString('url') ??
    say('Please paste url after /sheet.')
  bot.sheets[channel.id] = new Gsheet(newUrl)
  const [message, init] = await Promise.all([
    interaction.editReply(`sheet: ${newUrl}`),
    bot.sheets[channel.id].setPuzzlehunt()
  ])
  await channel.messages.pin(message)
  if (!init) {
    await interaction.followUp('There are some missing info in this sheet.')
  }
}

export default { data, execute }
