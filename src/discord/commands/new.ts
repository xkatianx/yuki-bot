import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'
import { say } from '../error.js'
import { createFolderAndSsheet } from '../../gsheet/folder.js'
import { Puzzlehunt } from '../../puzzlehunt/puzzlehunt.js'
import { commandPrecheck } from './_misc.js'
import { IRF } from './_main.js'

const data = new SlashCommandBuilder()
  .setName('new') // command here, should be the same as the file name
  .setDescription('Create a new puzzlehunt spreadsheet.')
  .addStringOption(option =>
    option
      .setName('url')
      .setDescription('The url of the puzzlehunt main page.')
      .setRequired(true)
  )

async function execute (
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const [bot, channel] = await commandPrecheck(interaction)
  await interaction.deferReply()

  const url = interaction.options.getString('url') ??
    say('Please enter puzzlehunt url.')
  const puzzlehunt = new Puzzlehunt(url)
  await puzzlehunt.scan()
  bot.setPuzzlehunt(channel.id, puzzlehunt)

  const edit = new ButtonBuilder()
    .setCustomId('bEditPuzzlehunt')
    .setLabel('Edit')
    .setStyle(ButtonStyle.Secondary)
  const create = new ButtonBuilder()
    .setCustomId('bCreatePuzzlehunt')
    .setLabel('Create')
    .setStyle(ButtonStyle.Success)
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(edit, create)

  await interaction.editReply({
    content: puzzlehunt.printToDiscord(),
    components: [row]
  })
}

export async function bEditPuzzlehunt (i: ButtonInteraction): Promise<void> {
  const bot = i.client.mybot
  const channel = i.channelId
  const puzzlehunt = bot.getPuzzlehunt(channel) ??
    say('Failed to create a puzzlehunt for this channel.')

  const modal = new ModalBuilder()
    .setCustomId('mEditPuzzlehunt')
    .setTitle('Create New Puzzlehunt')

  const inputs = [
    new TextInputBuilder()
      .setCustomId('title')
      .setLabel('title')
      .setPlaceholder('The title of the puzzlehunt')
      .setStyle(TextInputStyle.Short)
      .setValue(puzzlehunt.title ?? '')
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId('start')
      .setLabel('start time')
      .setPlaceholder('e.g. "2023-05-06T10:00:00-07:00"')
      .setStyle(TextInputStyle.Short)
      .setValue(puzzlehunt.getStartTime(false))
      .setRequired(false),
    new TextInputBuilder()
      .setCustomId('end')
      .setLabel('end time')
      .setPlaceholder('e.g. "2023-05-06T10:00:00-07:00"')
      .setStyle(TextInputStyle.Short)
      .setValue(puzzlehunt.getEndTime(false))
      .setRequired(false),
    new TextInputBuilder()
      .setCustomId('username')
      .setLabel('username')
      .setPlaceholder('The username to login to the puzzlehunt')
      .setStyle(TextInputStyle.Short)
      .setValue(puzzlehunt.username ?? '')
      .setRequired(false),
    new TextInputBuilder()
      .setCustomId('password')
      .setLabel('password')
      .setPlaceholder('The password to login to the puzzlehunt')
      .setStyle(TextInputStyle.Short)
      .setValue(puzzlehunt.password ?? '')
      .setRequired(false)
  ]

  modal.addComponents(...inputs.map(v =>
    new ActionRowBuilder<TextInputBuilder>().addComponents(v)
  ))

  await i.showModal(modal)
}

export const bCreatePuzzlehunt: IRF<ButtonInteraction> = async i => {
  const bot = i.client.mybot
  const channel = i.channel ??
    say('This button is not available in this channel.')
  const puzzlehunt = bot.getPuzzlehunt(channel.id) ??
    say('Failed to create a puzzlehunt for this channel.')
  if (puzzlehunt.title == null || puzzlehunt.title === '') {
    say('The title of the puzzlehunt can not be empty.')
  }
  await i.deferUpdate()
  const sSheet = await createFolderAndSsheet(puzzlehunt)
  await sSheet.writeCell('website', puzzlehunt.url).flushWrite()
  puzzlehunt.setSsheet(sSheet)
  bot.sheets[channel.id] = sSheet
  await i.editReply({ components: [] })
  const m = await i.followUp(`sheet: ${sSheet.url}`)
  await channel.messages.pin(m)
}

export const mEditPuzzlehunt: IRF<ModalSubmitInteraction> = async i => {
  const bot = i.client.mybot
  const channel = i.channelId
  const puzzlehunt = bot.getPuzzlehunt(channel ?? '') ??
    say('Failed to create a puzzlehunt for this channel.')
  const title = i.fields.getTextInputValue('title')
  const start = i.fields.getTextInputValue('start')
  const end = i.fields.getTextInputValue('end')
  const username = i.fields.getTextInputValue('username')
  const password = i.fields.getTextInputValue('password')
  puzzlehunt.title = title
  puzzlehunt.setStartTime(start)
  puzzlehunt.setEndTime(end)
  puzzlehunt.username = username
  puzzlehunt.password = password

  // Property 'update' does not exist on
  // type 'ModalSubmitInteraction<CacheType>'.ts(2339)
  // TODO: this just works fine. no idea why this error shows
  // @ts-expect-error
  await i.update({
    content: puzzlehunt.printToDiscord()
  })
}

export default { data, execute }
