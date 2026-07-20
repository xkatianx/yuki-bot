import { AsyncResult, result } from "always-panic"
import type { ChatInputCommandInteraction } from "discord.js"
import { AttachmentBuilder, SlashCommandBuilder } from "discord.js"
import { displayCode } from "~misc/format.js"
import { BotLogError } from "~util/discord/bot/log.js"
import { Form } from "~util/discord/util/form.js"
import { YukiBaseCommand } from "./_base.js"

class PuzzleCommand extends YukiBaseCommand {
  buildData() {
    return new SlashCommandBuilder()
      .setName("puzzle")
      .setDescription(
        "Add new puzzle tab to the solving spreadsheet of this channel."
      )
      .addStringOption((option) =>
        option
          .setName("url")
          .setDescription("The url of the puzzle.")
          .setRequired(true)
      )
  }

  execute(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString("url")
    if (url == null)
      return AsyncResult.from(
        BotLogError.say("Usage: `/puzzle <url>`. Please enter a url.")
      )
    return AsyncResult.from(
      result.all([
        this.getContext(interaction),
        this.getTextChannel(interaction),
      ])
    )
      .andThen(async ([{ bot }, channel]) => {
        await this.deferReply(interaction)
        return await bot.getChannelManager(channel)
      })
      .andThen((cm) =>
        cm.browser
          .browse(url)
          .andThen(() => cm.browser.getTitle())
          .andThen((title) =>
            AsyncResult.from(cm.browser.screenshot()).map((screenshot) => ({
              cm,
              title,
              screenshot,
            }))
          )
      )
      .mapErr((e) => this.handleError(e))
      .map(async ({ cm, title, screenshot }) => {
        const attachment = new AttachmentBuilder(Buffer.from(screenshot), {
          name: "screenshot.png",
        })
        await interaction.followUp({ files: [attachment] })

        const form = new Form()
          .addInput2({
            customId: "url",
            label: "URL",
            placeholder: "The url of the puzzle.",
            value: url,
            required: true,
          })
          .addInput2({
            customId: "title",
            label: "TITLE",
            placeholder: "The title of the puzzle.",
            value: title,
            required: true,
          })
          .setOnSubmit(async (form: Form) => {
            const url = form.get("url").unwrap()
            const title = form.get("title").unwrap()
            return (await cm.appendPuzzle(url, title))
              .map(() => `${displayCode(title)} added.`)
              .mapErr((e) => this.handleError(e))
          })
        await form.reply(interaction)
      })
  }
}

export default new PuzzleCommand()
