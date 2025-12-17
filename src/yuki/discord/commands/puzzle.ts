import type { ChatInputCommandInteraction } from "discord.js"
import { AttachmentBuilder, SlashCommandBuilder } from "discord.js"
import { displayCode } from "~misc/format.js"
import { Bot } from "~util/discord/bot.js"
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

  async execute(interaction: ChatInputCommandInteraction) {
    const { bot } = this.getContext(interaction)
    const channel = this.getTextChannel(interaction)
    const url =
      interaction.options.getString("url") ??
      Bot.say("Usage: `/puzzle <url>`. Please enter a url.")
    await this.deferReply(interaction)

    const cm = await this.unwrap(bot.getChannelManager(channel))
    const browser = cm.browser
    await this.unwrap(browser.browse(url))
    const title = await this.unwrap(browser.getTitle())
    const screenshot = await this.unwrap(browser.screenshot())
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
        return cm
          .appendPuzzle(url, title)
          .map(() => `${displayCode(title)} added.`)
      })
    await form.reply(interaction)
  }
}

export default new PuzzleCommand()
