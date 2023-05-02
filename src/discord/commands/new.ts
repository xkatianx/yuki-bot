import {
  CacheType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel
} from 'discord.js'
import { say } from '../error.js'
import { browse } from '../../puzzlehunt/browse.js'
import { createFolderAndSsheet } from '../../gsheet/folder.js'

const data = new SlashCommandBuilder()
  .setName('new')
  .setDescription('Create a new puzzlehunt spreadsheet.')
  .addStringOption(option =>
    option
      .setName('url')
      .setDescription('The url of the puzzlehunt.')
      .setRequired(true)
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

  const url =
    interaction.options.getString('url') ??
    say('Please enter puzzlehunt url.')
  const page = await browse(url)
  const sSheet = await createFolderAndSsheet(page.title)
  await sSheet.writeCell('website', url).flushWrite()

  bot.sheets[channel.id] = sSheet
  const [message, init] = await Promise.all([
    interaction.editReply(`sheet: ${sSheet.url}`),
    bot.sheets[channel.id].setPuzzlehunt()
  ])
  await channel.messages.pin(message)
  if (!init) {
    await interaction.followUp('There are some missing info in this sheet.')
  }
}

export default { data, execute }
