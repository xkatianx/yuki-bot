import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'
import { say } from '../error.js'
import { IRF } from './_main.js'
import { interactionFetch } from './_misc.js'
import { Puzzle } from '../../puzzlehunt/puzzle.js'
import { createFolder, copySsheetToFolder } from '../../gsheet/folder.js'
import { Gsheet } from '../../gsheet/gsheet.js'

const data = new SlashCommandBuilder()
  .setName('add')
  .setDescription(
    'Add new puzzle tab to the solving spreadsheet of this channel.'
  )
  .addStringOption(option =>
    option
      .setName('url')
      .setDescription('The url of the puzzle.')
      .setRequired(true)
  )

const execute: IRF<ChatInputCommandInteraction> = async i => {
  const { bot, channel } = interactionFetch(i)
  const url = i.options.getString('url') ??
    say('Usage: `/add <url>`. Please enter the url.')
  await i.deferReply()

  const ph = await bot.getPuzzlehuntFromSheet(channel, true)
  const page = await ph.browse(url) as Puzzle

  const edit = new ButtonBuilder()
    .setCustomId('bAddEdit')
    .setLabel('Edit')
    .setStyle(ButtonStyle.Secondary)
  const create = new ButtonBuilder()
    .setCustomId('bAddCreate')
    .setLabel('Create')
    .setStyle(ButtonStyle.Success)
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(edit, create)

  const m = await i.editReply({
    content: page.printToDiscord(),
    components: [row]
  })
  ph.tmpPuzzles[m.id] = page
}

export default { data, execute }

export const bAddEdit: IRF<ButtonInteraction> = async i => {
  const { bot, channel } = interactionFetch(i)
  const ph =
    bot.getPuzzlehunt(channel) ??
    say('Failed to create a puzzlehunt for this channel.')
  const puzzle = ph.tmpPuzzles[i.message.id]

  const modal = new ModalBuilder()
    .setCustomId('mAddEdit')
    .setTitle('Create New Puzzle')

  const inputs = [
    new TextInputBuilder()
      .setCustomId('title')
      .setLabel('title')
      .setPlaceholder('The title of the puzzle')
      .setStyle(TextInputStyle.Short)
      .setValue(puzzle.title)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId('tab')
      .setLabel('sheet tab')
      .setPlaceholder('The tab name of the sheet')
      .setStyle(TextInputStyle.Short)
      .setValue(puzzle.title)
      .setRequired(true)
  ]

  modal.addComponents(
    ...inputs.map(v =>
      new ActionRowBuilder<TextInputBuilder>().addComponents(v)
    )
  )

  await i.showModal(modal)
}

export const bAddCreate: IRF<ButtonInteraction> = async i => {
  const { bot, channel, guild } = interactionFetch(i)
  const ph =
    bot.getPuzzlehunt(channel) ??
    say('Failed to create a puzzlehunt for this channel.')
  if (ph.title == null || ph.title === '') {
    say('The title of the puzzlehunt can not be empty.')
  }
  await i.deferUpdate()
  const setting = bot.getSetting(guild)
  const rootFolder = setting.drive
  const driveId = rootFolder?.match(/\/folders\/([^/]+)/)?.at(1) ??
    say('Please use /setting to set google drive first.')
  const templateSheet = setting.sheet
  const sheetId = templateSheet?.match(/\/d\/([^/]+)/)?.at(1) ??
    say('Please use /setting to set template spreadsheet first.')

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

export const mAddEdit: IRF<ModalSubmitInteraction> = async i => {
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
