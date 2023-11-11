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
import {
  GFolder,
  copySsheetToFolder,
  createFolder
} from '../../gsheet/folder.js'
import { Puzzlehunt } from '../../puzzlehunt/puzzlehunt.js'
import { interactionFetch } from './_misc.js'
import { IRF } from './_main.js'
import { GSpreadsheet, Gsheet } from '../../gsheet/gsheet.js'
import { getRootFolder } from '../yuki/root.js'

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
  const { bot, channel, guild } = interactionFetch(interaction)
  await interaction.deferReply()

  const url =
    interaction.options.getString('url') ?? say('Please enter puzzlehunt url.')
  const setting = bot.getSetting(guild)
  const puzzlehunt = new Puzzlehunt(url, setting.username, setting.password)
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
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(edit, create)

  await interaction.editReply({
    content: puzzlehunt.printToDiscord(),
    components: [row]
  })
}

export async function bEditPuzzlehunt (i: ButtonInteraction): Promise<void> {
  const { bot, channel } = interactionFetch(i)
  const puzzlehunt =
    bot.getPuzzlehunt(channel) ??
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

  modal.addComponents(
    ...inputs.map(v =>
      new ActionRowBuilder<TextInputBuilder>().addComponents(v)
    )
  )

  await i.showModal(modal)
}

export const bCreatePuzzlehunt: IRF<ButtonInteraction> = async i => {
  const { bot, channel, guild } = interactionFetch(i)
  const ph =
    bot.getPuzzlehunt(channel) ??
    say('Failed to create a puzzlehunt for this channel.')
  if (ph.title == null || ph.title === '') {
    say('The title of the puzzlehunt can not be empty.')
  }
  await i.deferUpdate()

  // old method
  const setting = bot.getSetting(guild)
  const rootFolder = setting.drive
  let driveId
  if (rootFolder != null) {
    driveId = GFolder.fromUrl(rootFolder).id
  } else {
    const root = await getRootFolder(bot, guild)
    if (root.err) say('Please use /root to set root folder first.')
    driveId = root.unwrap().id
  }
  const sheetId = GSpreadsheet.template.puzzles.id

  const newFolder = await createFolder(ph.title, driveId)
  if (newFolder === '') say(`Unable to create folder "${ph.title}"`)
  const newFolderUrl = `https://drive.google.com/drive/u/0/folders/${newFolder}`
  const newSheet = await copySsheetToFolder(sheetId, ph.title, newFolder)
  if (newSheet === '') say(`Unable to create spreadsheet "${ph.title}"`)
  const sSheetUrl = `https://docs.google.com/spreadsheets/d/${newSheet}`
  const sSheet = new Gsheet(sSheetUrl)
    .writeCell('folder', newFolderUrl)
    .writeCell('username', ph.username ?? '')
    .writeCell('password', ph.password ?? '')
    .writeCell('website', ph.url)
  await sSheet.flushWrite()
  ph.setSsheet(sSheet)
  bot.sheets[channel.id] = sSheet
  await i.editReply({ components: [] })
  const m = await i.followUp(`sheet: ${sSheet.url}`)
  await channel.messages.pin(m)
}

export const mEditPuzzlehunt: IRF<ModalSubmitInteraction> = async i => {
  const { bot, channel } = interactionFetch(i)
  const puzzlehunt =
    bot.getPuzzlehunt(channel) ??
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

  if (i.isFromMessage()) {
    await i.update({
      content: puzzlehunt.printToDiscord()
    })
  }
}

export default { data, execute }
