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
import { interactionFetch } from './_misc.js'
import { IRF } from './_main'

export class Setting {
  /** the username to register puzzlehunts */
  username?: string
  /** the password to register puzzlehunts */
  password?: string
  /** the url of google drive to store sheets */
  drive?: string
  /** the url of the template spreadsheet */
  sheet?: string
  /** the channel to log debug messages */
  channel?: string = 'not available yet'

  hl (input?: string): string {
    if (input == null || input === '') return ''
    return `\`${input}\``
  }

  printToDiscord (): string {
    return [
      `register username: ${this.hl(this.username)}`,
      `register password: ${this.hl(this.password)}`,
      '',
      `google drive folder: ${this.hl(this.drive)}`,
      `google spreadsheet template: ${this.hl(this.sheet)}`,
      '',
      `discord logging channel: ${this.hl(this.channel)}`
    ].join('\n')
  }
}

const data = new SlashCommandBuilder()
  .setName('setting')
  .setDescription('Get/Set some settings.')

const execute: IRF<ChatInputCommandInteraction> = async interaction => {
  const { bot, guild } = interactionFetch(interaction)
  const setting = bot.getSetting(guild)

  const reg = new ButtonBuilder()
    .setCustomId('bSettingRegister')
    .setLabel('Edit Register')
    .setStyle(ButtonStyle.Secondary)
  const goo = new ButtonBuilder()
    .setCustomId('bSettingGoogle')
    .setLabel('Edit Google')
    .setStyle(ButtonStyle.Secondary)
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(reg, goo)
  await interaction.reply({
    content: setting.printToDiscord(),
    components: [row],
    ephemeral: true
  })
}

export default { data, execute }

export const bSettingRegister: IRF<ButtonInteraction> = async i => {
  const { bot, guild } = interactionFetch(i)
  const setting = bot.getSetting(guild)
  const modal = new ModalBuilder()
    .setCustomId('mSettingRegister')
    .setTitle('Setting - Register')
    .addComponents(
      ...[
        new TextInputBuilder()
          .setCustomId('username')
          .setLabel('register username')
          .setStyle(TextInputStyle.Short)
          .setValue(setting.username ?? '')
          .setRequired(false),
        new TextInputBuilder()
          .setCustomId('password')
          .setLabel('register password')
          .setStyle(TextInputStyle.Short)
          .setValue(setting.password ?? '')
          .setRequired(false)
      ].map(v => new ActionRowBuilder<TextInputBuilder>().addComponents(v))
    )
  await i.showModal(modal)
}

export const mSettingRegister: IRF<ModalSubmitInteraction> = async i => {
  const { bot, guild } = interactionFetch(i)
  const setting = bot.getSetting(guild)
  setting.username = i.fields.getTextInputValue('username')
  setting.password = i.fields.getTextInputValue('password')
  if (i.isFromMessage()) {
    await i.update({
      content: setting.printToDiscord()
    })
  }
  await i.followUp(`${i.user.toString()} has changed the settings.`)
}

export const bSettingGoogle: IRF<ButtonInteraction> = async i => {
  const { bot, guild } = interactionFetch(i)
  const setting = bot.getSetting(guild)
  const modal = new ModalBuilder()
    .setCustomId('mSettingGoogle')
    .setTitle('Setting - Google')
    .addComponents(
      ...[
        new TextInputBuilder()
          .setCustomId('drive')
          .setLabel('google drive url')
          .setStyle(TextInputStyle.Short)
          .setValue(setting.drive ?? '')
          .setRequired(false),
        new TextInputBuilder()
          .setCustomId('sheet')
          .setLabel('google spreadsheet template url')
          .setStyle(TextInputStyle.Short)
          .setValue(setting.sheet ?? '')
          .setRequired(false)
      ].map(v => new ActionRowBuilder<TextInputBuilder>().addComponents(v))
    )
  await i.showModal(modal)
}

export const mSettingGoogle: IRF<ModalSubmitInteraction> = async i => {
  const { bot, guild } = interactionFetch(i)
  const setting = bot.getSetting(guild)
  setting.drive = i.fields.getTextInputValue('drive')
  setting.sheet = i.fields.getTextInputValue('sheet')
  if (i.isFromMessage()) {
    await i.update({
      content: setting.printToDiscord()
    })
  }
  await i.followUp(`${i.user.toString()} has changed the settings.`)
}
