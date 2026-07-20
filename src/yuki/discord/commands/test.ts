import { AsyncResult, ok } from "always-panic"
import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder } from "discord.js"
import { YukiBaseCommand } from "./_base.js"

class TestCommand extends YukiBaseCommand {
  buildData() {
    return new SlashCommandBuilder()
      .setName("test") // command here, should be the same as the filename
      .setDescription(
        // description here
        "This is a test slash command. This may do anything."
      )
      .addStringOption((option) =>
        option
          .setName("url")
          .setDescription("The url of the puzzle.")
          .setRequired(true)
      )
  }

  execute(interaction: ChatInputCommandInteraction) {
    return AsyncResult.from(ok(undefined)).map(async () => {
      await interaction.reply("Hello!")
    })
  }
}

export default new TestCommand()
