import { AsyncResult, ok, result } from "always-panic"
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
import { BotLogError } from "~util/discord/bot/log.js"
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

  execute(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString("url")
    if (url == null)
      return AsyncResult.from(
        BotLogError.say("Usage: `/new <url>`. Please enter a url.")
      )
    return AsyncResult.from(
      result.all([
        this.getContext(interaction),
        this.getTextChannel(interaction),
      ])
    )
      .andThen(async ([{ bot, guild }, channel]) => {
        await this.deferReply(interaction)

        const rootFolder = await bot.getRootFolder(guild)
        if (rootFolder.isErr()) return rootFolder
        const settings = await bot.getSettings(guild)
        if (settings.isErr()) return settings
        const browserR = await MyBrowser.new().inspect(async (b) => {
          await b.browse(url)
        })
        if (browserR.isErr()) return browserR
        await using browser = browserR.value
        return ok({
          channel,
          rootFolder: rootFolder.value,
          settings: settings.value,
          url2: (await browser.getUrl()).unwrapOr(url),
          title: (await browser.getTitle()).unwrapOr("<title>"),
        })
      })
      .mapErr((e) => this.handleError(e))
      .map(async ({ channel, rootFolder, settings, url2, title }) => {
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
            return await rootFolder
              .getOrCreateFolder(args.folder)
              .andThen(async (folder) => {
                // step 2: copy-paste main spreadsheet and edit
                const sheet = await PuzzleSheet.newFromTemplate(
                  folder,
                  args.title
                )
                if (sheet.isErr()) return sheet
                const spreadsheet = sheet.value
                  .writeCell("folder", folder.url)
                  .writeCell("username", args.username)
                  .writeCell("password", args.password)
                  .writeCell("website", args.url)
                return await spreadsheet
                  .flushWrite()
                  // step 3: edit settings
                  .andThen(() =>
                    settings.setChannelManager(channel, folder, spreadsheet)
                  )
                  // step 4: done
                  .map(() => `Spreadsheet: ${spreadsheet.url}`)
              })
              .mapErr((e) => this.handleError(e))
          })
        form.setAfterSubmit(() =>
          AsyncResult.from(settings.getChannelManager(channel))
            .map(async (cm) => {
              await interaction.followUp(
                this.setTopicConfirm(channel, cm.spreadsheet.url)
              )
            })
            .mapErr((e) => this.handleError(e))
        )

        await form.reply(interaction)
      })
  }

  private setTopicConfirm(
    channel: TextChannel,
    topic: string
  ): InteractionReplyOptions {
    const text =
      "Do you want to set the topic of this channel to" +
      displayCode(topic) +
      "?"
    const onYes: IRF<ButtonInteraction> = (i) =>
      AsyncResult.from(async () => {
        await i.deferReply({ ephemeral: true })
        await channel.setTopic(topic)
        await i.editReply("done!")
        return ok(undefined)
      })
    const uid = InteractionHandler.setButton(onYes)
    const yes = new ButtonBuilder()
      .setCustomId(uid)
      .setLabel("Yes")
      .setStyle(ButtonStyle.Success)

    const onNo: IRF<ButtonInteraction> = (i) =>
      AsyncResult.from(async () => {
        await i.reply("okay.")
        return ok(undefined)
      })
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
