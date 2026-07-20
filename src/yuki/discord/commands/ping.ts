import { AsyncResult } from "always-panic"
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

  execute(interaction: ChatInputCommandInteraction) {
    const now = discordTime(Temporal.Now.instant(), "T")
    return AsyncResult.from(this.getContext(interaction)).map(
      async ({ bot }) => {
        await interaction.reply(
          lines(
            `Request time: ${now}`,
            `Last time I woke up: ${discordTime(bot.readyTime)}`
          )
        )
      }
    )
  }
}

export default new PingCommand()
