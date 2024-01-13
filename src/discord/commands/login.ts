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

const data = new SlashCommandBuilder()
  .setName('login') // command here, should be the same as the filename
  .setDescription('Use this when the bot failed to auto-login.') // description here

async function execute (
  interaction: ChatInputCommandInteraction<CacheType>
): Promise<void> {
  const { bot, channel } = interactionFetch(interaction)
  await interaction.deferReply()

  const things = (await bot.getChannelThings(channel)).unwrapOrElse(say)
  const ss = things.spreadsheet
  const info = await ss.readIndexInfo()
  const url = new URL('/login', info.website).href

  const form = new Form()
    .addInput(
      new TextInputBuilder()
        .setCustomId('url')
        .setLabel('URL')
        .setPlaceholder('The url of the login page')
        .setStyle(TextInputStyle.Short)
        .setValue(url)
        .setRequired(true)
    )
    .addInput(
      new TextInputBuilder()
        .setCustomId('username')
        .setLabel('USERNAME')
        .setPlaceholder('The username to login to the puzzlehunt')
        .setStyle(TextInputStyle.Short)
        .setValue(info.username)
        .setRequired(true)
    )
    .addInput(
      new TextInputBuilder()
        .setCustomId('password')
        .setLabel('PASSWORD')
        .setPlaceholder('The password to login to the puzzlehunt')
        .setStyle(TextInputStyle.Short)
        .setValue(info.password)
        .setRequired(true)
    )
    .setOnSubmit(async (form: Form) => {
      const args = {
        url: form.get('url').unwrap(),
        username: form.get('username').unwrap(),
        password: form.get('password').unwrap()
      }
      things.browser.isLogin = false
      await things.browser.login(args.username, args.password, args.url)
      return 'done'
    })

  await form.reply(interaction)
}

export default { data, execute }
