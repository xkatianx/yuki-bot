import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  TextChannel,
} from "discord.js"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from "discord.js"
import { displayCode } from "~misc/format.js"
import { YYYY$MM } from "~misc/time/timestamp.js"
import MyBrowser from "~util/browser/browser.js"
import { Bot } from "~util/discord/bot.js"
import type { IRF } from "~util/discord/commands/base.js"
import { Form } from "~util/discord/util/form.js"
import { InteractionHandler } from "~util/discord/util/interaction.js"
import { PuzzleSheet } from "../../guildManager/root/settings/channelManager/puzzle/puzzleSheet.js"
import { YukiBaseCommand } from "./_base.js"

class NewCommand extends YukiBaseCommand {
  buildData() {
    return new SlashCommandBuilder()
      .setName("new") // command here, should be the same as the file name
      .setDescription("Create a new puzzlehunt spreadsheet.")
      .addStringOption((option) =>
        option
          .setName("url")
          .setDescription("The url of the puzzlehunt main page.")
          .setRequired(true)
      )
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const { bot, guild } = this.getContext(interaction)
    const channel = this.getTextChannel(interaction)
    const url =
      interaction.options.getString("url") ??
      Bot.say("Usage: `/new <url>`. Please enter a url.")
    await this.deferReply(interaction)

    const rootFolder = await this.unwrap(bot.getRootFolder(guild))
    const settings = await this.unwrap(bot.getSettings(guild))
    await using browser = await this.unwrap(
      MyBrowser.new().inspect(async (b) => {
        await b.browse(url)
      })
    )
    const url2 = (await browser.getUrl()).unwrapOr(url)
    const title = (await browser.getTitle()).unwrapOr("<title>")
    const folder = `[${YYYY$MM()}] ${title}`

    const form = new Form()
      .addInput2({
        customId: "url",
        label: "URL",
        placeholder: "The main url of the puzzlehunt",
        value: url2,
        required: true,
      })
      .addInput2({
        customId: "title",
        label: "TITLE",
        placeholder: "The title of the puzzlehunt",
        value: title,
        required: true,
      })
      .addInput2({
        customId: "folder",
        label: "FOLDER NAME",
        placeholder:
          "The spreadsheet will be created under this google drive folder",
        value: folder,
        required: true,
      })
      .addInput2({
        customId: "start",
        label: "START TIME",
        placeholder: 'e.g. "2023-05-06T10:00:00-07:00"',
      })
      .addInput2({
        customId: "end",
        label: "END TIME",
        placeholder: 'e.g. "2023-05-06T10:00:00-07:00"',
      })
      .addInput2({
        customId: "username",
        label: "USERNAME",
        placeholder: "The username to login to the puzzlehunt",
      })
      .addInput2({
        customId: "password",
        label: "PASSWORD",
        placeholder: "The password to login to the puzzlehunt",
      })
      .setOnSubmit(async (form: Form) => {
        const args = {
          url: form.get("url").unwrap(),
          title: form.get("title").unwrap(),
          folder: form.get("folder").unwrap(),
          start: form.get("start").unwrap(),
          end: form.get("end").unwrap(),
          username: form.get("username").unwrap(),
          password: form.get("password").unwrap(),
        }
        // step 1: get or create a folder
        const folder = await this.unwrap(
          rootFolder.getOrCreateFolder(args.folder)
        )

        // step 2: copy-paste main spreadsheet and edit
        const spreadsheet = (
          await PuzzleSheet.newFromTemplate(folder, args.title)
        )
          .unwrapOrElse(() => Bot.say("Unable to create a spreadsheet."))
          .writeCell("folder", folder.url)
          .writeCell("username", args.username)
          .writeCell("password", args.password)
          .writeCell("website", args.url)
        await this.unwrap(spreadsheet.flushWrite())

        // step 3: edit settings
        await this.unwrap(
          settings.setChannelManager(channel, folder, spreadsheet)
        )
        // step 4: edit channel manager

        // step 5: done
        return `Spreadsheet: ${spreadsheet.url}`
      })
    form.setAfterSubmit(async () => {
      const url = (await settings.getChannelManager(channel)).unwrapOrElse(
        (e) => Bot.say(e)
      ).spreadsheet.url
      await interaction.followUp(this.setTopicConfirm(channel, url))
    })

    await form.reply(interaction)
  }

  private setTopicConfirm(
    channel: TextChannel,
    topic: string
  ): InteractionReplyOptions {
    const text =
      "Do you want to set the topic of this channel to" +
      displayCode(topic) +
      "?"
    const onYes: IRF<ButtonInteraction> = async (i) => {
      await i.deferReply({ ephemeral: true })
      await channel.setTopic(topic)
      await i.editReply("done!")
    }
    const uid = InteractionHandler.setButton(onYes)
    const yes = new ButtonBuilder()
      .setCustomId(uid)
      .setLabel("Yes")
      .setStyle(ButtonStyle.Success)

    const onNo: IRF<ButtonInteraction> = async (i) => {
      await i.reply("okay.")
    }
    const uid2 = InteractionHandler.setButton(onNo)
    const no = new ButtonBuilder()
      .setCustomId(uid2)
      .setLabel("No")
      .setStyle(ButtonStyle.Danger)

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(yes, no)
    return { content: text, components: [row], ephemeral: true }
  }
}

export default new NewCommand()
