import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder } from "discord.js"
import { displayCode } from "~misc/format.js"
import { Bot } from "~util/discord/bot.js"
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

  async execute(interaction: ChatInputCommandInteraction) {
    const { bot } = this.getContext(interaction)
    const channel = this.getTextChannel(interaction)
    const title = interaction.options.getString("title") ?? ""
    if (title === "") Bot.say("You have to input a non-empty title.")
    await this.deferReply(interaction)

    await this.unwrap(
      bot.getChannelManager(channel).andThen((cm) => cm.appendRound(title))
    )
    await interaction.editReply(`Round ${displayCode(title)} added.`)
  }
}

export default new RoundCommand()
