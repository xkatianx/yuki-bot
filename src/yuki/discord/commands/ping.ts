import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder } from "discord.js"
import { lines } from "~misc/format.js"
import { discordTime, Temporal } from "~misc/time/index.js"
import { YukiBaseCommand } from "./_base.js"

class PingCommand extends YukiBaseCommand {
  buildData() {
    return new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Ping the bot to check if it is alive.")
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const now = discordTime(Temporal.Now.instant(), "T")
    const { bot } = this.getContext(interaction)
    await interaction.reply(
      lines(
        `Request time: ${now}`,
        `Last time I woke up: ${discordTime(bot.readyTime)}`
      )
    )
  }
}

export default new PingCommand()
