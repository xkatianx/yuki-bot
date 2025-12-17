import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder } from "discord.js"
import { Bot } from "~util/discord/bot.js"
import { setRootFolderUrl } from "../../guildManager/root/root.js"
import { YukiBaseCommand } from "./_base.js"

class RootCommand extends YukiBaseCommand {
  buildData() {
    return new SlashCommandBuilder()
      .setName("root")
      .setDescription(
        "Get/Set the root Google drive folder for the current discord guild. " +
          "This command is owner-only."
      )
      .addStringOption((option) =>
        option
          .setName("url")
          .setDescription("The url of the Google drive folder.")
      )
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const { bot, channel, guild } = this.getContext(interaction)
    await this.deferReply(interaction)
    if (interaction.user.id !== guild.ownerId)
      Bot.say("This command is owner-only.")

    const newRootUrl = interaction.options.getString("url")
    if (newRootUrl == null) {
      // GET
      const oldRoot = await this.unwrap(bot.getRootFolder(guild))
      Bot.say(`The root folder for this server:\n${oldRoot.url}`)
    } else {
      // SET
      // set root folder url by pinning certain message
      const reply = setRootFolderUrl(newRootUrl).unwrapOrElse((e) => Bot.say(e))
      const m = await interaction.editReply(reply)
      await channel.messages.pin(m)
      bot.roots.reset(guild.id)
    }
  }
}

export default new RootCommand()

/* TODO:
- deal with the case when set but old exists
- follows to ask default name/pw and create settings
*/
