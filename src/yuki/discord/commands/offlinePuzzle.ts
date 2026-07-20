import { AsyncResult, result } from "always-panic"
import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder } from "discord.js"
import { displayCode } from "~misc/format.js"
import { BotLogError } from "~util/discord/bot/log.js"
import { appendPuzzle } from "../../guildManager/root/settings/channelManager/channelManager.js"
import { YukiBaseCommand } from "./_base.js"

class OfflinePuzzleCommand extends YukiBaseCommand {
  buildData() {
    return new SlashCommandBuilder()
      .setName("offline-puzzle")
      .setDescription(
        "Add new puzzle tab to the solving spreadsheet of this channel," +
          " without visiting the url."
      )
      .addStringOption((option) =>
        option
          .setName("url")
          .setDescription("The url of the puzzle.")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("title")
          .setDescription("The title of the puzzle.")
          .setRequired(true)
      )
  }

  execute(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString("url")
    if (url == null)
      return AsyncResult.from(
        BotLogError.say(
          "Usage: `/offline-puzzle <url> <title>`. Please enter a url."
        )
      )
    const title = interaction.options.getString("title")
    if (title == null || title === "")
      return AsyncResult.from(
        BotLogError.say("You have to input a non-empty title.")
      )
    return AsyncResult.from(
      result.all([
        this.getContext(interaction),
        this.getTextChannel(interaction),
      ])
    )
      .andThen(async ([{ bot }, channel]) => {
        await this.deferReply(interaction)
        return await bot.getPuzzleSheet(channel)
      })
      .andThen((spreadsheet) => appendPuzzle(spreadsheet, url, title))
      .mapErr((e) => this.handleError(e))
      .map(async () => {
        await interaction.editReply(`${displayCode(title)} added.`)
      })
  }
}

export default new OfflinePuzzleCommand()
