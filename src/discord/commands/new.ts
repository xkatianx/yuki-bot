import {
  CacheType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'
import { say } from '../error.js'
import { interactionFetch } from './_misc.js'
import { Form } from './handler/form.js'
import { Gph } from '../../gph/main.js'
import moment from 'moment'
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
    interaction.options.getString('url') ??
    say('Please enter the puzzlehunt url.')
  const rootFolder = (await getRootFolder(bot, guild)).unwrapOrElse(say)

  const browser = new Gph(url)
  await browser.start()
  const url2 = browser.getUrl()
  const title = await browser.getTitle()
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
      const folder = await (
        await rootFolder.findFolder(args.folder)
      ).unwrapOrElse(async _ => {
        return (await rootFolder.newFolder(args.folder)).unwrapOrElse(_ =>
          say('Unable to create a new folder.')
        )
      })
      const ss = (await folder.createDefaultSpreadsheet(args.title))
        .unwrapOrElse(_ => say('Unable to create a spreadsheet.'))
        .writeCell('folder', folder.url)
        .writeCell('username', args.username)
        .writeCell('password', args.password)
        .writeCell('website', args.url)
      await ss.flushWrite()
      bot.setChannelThings(channel.id, ss, browser)
      return form.printToDiscord()
    })
  form.setAfterSubmit(async () => {
    const ss = (await bot.getSS(channel)).unwrapOrElse(say)
    const msg = await interaction.followUp(`sheet: ${ss.url}`)
    await channel.messages.pin(msg)
    // TODO make this with button
    // await channel.setTopic(newDescription)
  })

  await form.reply(interaction)
}

export default { data, execute }
