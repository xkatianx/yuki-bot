import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'
import { say } from '../error.js'
import { interactionFetch } from './_misc.js'
import { Form } from './handler/form.js'
import { IRF } from './_main.js'

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
    say('Usage: `/add <url>`. Please enter a url.')
  await i.deferReply()

  const title = await bot.scanTitle(channel, url)

  const form = new Form()
    .addInput(
      new TextInputBuilder()
        .setCustomId('url')
        .setLabel('URL')
        .setPlaceholder('The url of the puzzle.')
        .setStyle(TextInputStyle.Short)
        .setValue(url)
        .setRequired(true)
    )
    .addInput(
      new TextInputBuilder()
        .setCustomId('title')
        .setLabel('TITLE')
        .setPlaceholder('The title of the puzzle.')
        .setStyle(TextInputStyle.Short)
        .setValue(title)
        .setRequired(true)
    )
    .setOnSubmit(async (form: Form) => {
      const url = form.get('url').unwrap()
      const title = form.get('title').unwrap()
      const tabName = await bot.appendPuzzle(channel, url, title)
      return `"${tabName}" added.`
    })
  await form.reply(i)
}

export default { data, execute }
