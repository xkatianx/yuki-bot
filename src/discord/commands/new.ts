import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  SlashCommandBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'
import { say } from '../error.js'
import { fetchTextChannel, interactionFetch } from './_misc.js'
import { Form } from './handler/form.js'
import moment from 'moment'
import { IRF } from './_main.js'
import { InteractionHandler } from './handler/interaction.js'
import { Browser } from '../yuki/channelManager/browser.js'

const data = new SlashCommandBuilder()
  .setName('new') // command here, should be the same as the file name
  .setDescription('Create a new puzzlehunt spreadsheet.')
  .addStringOption(option =>
    option
      .setName('url')
      .setDescription('The url of the puzzlehunt main page.')
      .setRequired(true)
  )

const execute: IRF<ChatInputCommandInteraction> = async i => {
  const { bot, guild } = interactionFetch(i)
  const channel = fetchTextChannel(i)
  const url =
    i.options.getString('url') ??
    say('Usage: `/new <url>`. Please enter a url.')
  await i.deferReply()

  const rootFolder = (await bot.getRootFolder(guild)).unwrapOrElse(say)
  const settings = (await bot.getSettings(guild)).unwrapOrElse(say)

  using browser = new Browser(url)
  const url2 = (await browser.getUrl()).unwrapOr(url)
  const title = (await browser.getTitle()).unwrapOr('<title>')
  const folder = `[${moment().format('YYYY/MM')}] ${title}`

  const form = new Form()
    .addInput(
      new TextInputBuilder()
        .setCustomId('url')
        .setLabel('URL')
        .setPlaceholder('The main url of the puzzlehunt')
        .setStyle(TextInputStyle.Short)
        .setValue(url2)
        .setRequired(true)
    )
    .addInput(
      new TextInputBuilder()
        .setCustomId('title')
        .setLabel('TITLE')
        .setPlaceholder('The title of the puzzlehunt')
        .setStyle(TextInputStyle.Short)
        .setValue(title)
        .setRequired(true)
    )
    .addInput(
      new TextInputBuilder()
        .setCustomId('folder')
        .setLabel('FOLDER NAME')
        .setPlaceholder(
          'The spreadsheet will be created under this google drive folder'
        )
        .setStyle(TextInputStyle.Short)
        .setValue(folder)
        .setRequired(true)
    )
    .addInput(
      new TextInputBuilder()
        .setCustomId('start')
        .setLabel('START TIME')
        .setPlaceholder('e.g. "2023-05-06T10:00:00-07:00"')
        .setStyle(TextInputStyle.Short)
        // .setValue(puzzlehunt.getStartTime(false))
        .setRequired(false)
    )
    .addInput(
      new TextInputBuilder()
        .setCustomId('end')
        .setLabel('END TIME')
        .setPlaceholder('e.g. "2023-05-06T10:00:00-07:00"')
        .setStyle(TextInputStyle.Short)
        // .setValue(puzzlehunt.getEndTime(false))
        .setRequired(false)
    )
    .addInput(
      new TextInputBuilder()
        .setCustomId('username')
        .setLabel('USERNAME')
        .setPlaceholder('The username to login to the puzzlehunt')
        .setStyle(TextInputStyle.Short)
        // .setValue(puzzlehunt.username ?? '')
        .setRequired(false)
    )
    .addInput(
      new TextInputBuilder()
        .setCustomId('password')
        .setLabel('PASSWORD')
        .setPlaceholder('The password to login to the puzzlehunt')
        .setStyle(TextInputStyle.Short)
        // .setValue(puzzlehunt.password ?? '')
        .setRequired(false)
    )
    .setOnSubmit(async (form: Form) => {
      const args = {
        url: form.get('url').unwrap(),
        title: form.get('title').unwrap(),
        folder: form.get('folder').unwrap(),
        start: form.get('start').unwrap(),
        end: form.get('end').unwrap(),
        username: form.get('username').unwrap(),
        password: form.get('password').unwrap()
      }
      // step 1: get or create a folder
      const folder = (
        await rootFolder.getOrCreateFolder(args.folder)
      ).unwrapOrElse(say)

      // step 2: copy-paste main spreadsheet and edit
      const spreadsheet = (await folder.createDefaultSpreadsheet(args.title))
        .unwrapOrElse(_ => say('Unable to create a spreadsheet.'))
        .writeCell('folder', folder.url)
        .writeCell('username', args.username)
        .writeCell('password', args.password)
        .writeCell('website', args.url)
      await spreadsheet.flushWrite()
      // step 3: edit settings
      ;(
        await settings.setChannelManager(channel, folder, spreadsheet)
      ).unwrapOrElse(say)
      // step 4: edit channel manager

      // step 5: done
      return `Spreadsheet: ${spreadsheet.url}`
    })
  form.setAfterSubmit(async () => {
    const url = (await settings.getChannelManager(channel)).unwrapOrElse(say)
      .spreadsheet?.url
    if (url == null) say('Unable to find the spreadsheet.')
    await i.followUp(setTopicConfirm(channel, url))
  })

  await form.reply(i)
}

function setTopicConfirm (
  channel: TextChannel,
  topic: string
): InteractionReplyOptions {
  const text = `Do you want to set the topic of this channel to \`${topic}\`?`
  const onYes: IRF<ButtonInteraction> = async i => {
    await i.deferReply({ ephemeral: true })
    await channel.setTopic(topic)
    await i.editReply('done!')
  }
  const uid = InteractionHandler.setButton(onYes)
  const yes = new ButtonBuilder()
    .setCustomId(uid)
    .setLabel('Yes')
    .setStyle(ButtonStyle.Success)

  const onNo: IRF<ButtonInteraction> = async i => {
    await i.reply('okay.')
  }
  const uid2 = InteractionHandler.setButton(onNo)
  const no = new ButtonBuilder()
    .setCustomId(uid2)
    .setLabel('No')
    .setStyle(ButtonStyle.Danger)

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(yes, no)
  return { content: text, components: [row], ephemeral: true }
}

export default { data, execute }
