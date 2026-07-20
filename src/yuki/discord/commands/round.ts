import { AsyncResult, result } from "always-panic"
import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder } from "discord.js"
import { displayCode } from "~misc/format.js"
import { BotLogError } from "~util/discord/bot/log.js"
import { YukiBaseCommand } from "./_base.js"

class RoundCommand extends YukiBaseCommand {
  buildData() {
    return new SlashCommandBuilder()
      .setName("round")
      .setDescription("Add a new round title in the spreadsheet INDEX.")
      .addStringOption((option) =>
        option
          .setName("title")
          .setDescription("The round title to append.")
          .setRequired(true)
      )
  }

  execute(interaction: ChatInputCommandInteraction) {
    const title = interaction.options.getString("title") ?? ""
    if (title === "")
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
        return await bot
          .getChannelManager(channel)
          .andThen((cm) => cm.appendRound(title))
      })
      .mapErr((e) => this.handleError(e))
      .map(async () => {
        await interaction.editReply(`Round ${displayCode(title)} added.`)
      })
  }
}

export default new RoundCommand()
