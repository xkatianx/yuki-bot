import { ok, result } from "always-panic"
import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder } from "discord.js"
import { warn } from "~misc/cli.js"
import { BotLogError } from "~util/discord/bot/log.js"
import {
  parseRootFolderUrl,
  saveRootUrlToRegistry,
} from "../../guildManager/root/root.js"
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

  execute(interaction: ChatInputCommandInteraction) {
    const self = this
    return result
      .gen(async function* () {
        const { bot, channel, guild } = yield* self.getContext(interaction)
        await self.deferReply(interaction)
        if (interaction.user.id !== guild.ownerId)
          return BotLogError.say("This command is owner-only.")

        const newRootUrl = interaction.options.getString("url")
        if (newRootUrl == null) {
          // GET
          const oldRoot = yield* await bot.getRootFolder(guild)
          await interaction.editReply(
            `The root folder for this server:\n${oldRoot.url}`
          )
          return ok()
        }
        // SET
        // save the root folder url to the registry spreadsheet;
        // the current channel becomes the logging channel
        const url = yield* parseRootFolderUrl(newRootUrl)
        yield* await saveRootUrlToRegistry(guild, channel.id, url)
        bot.roots.reset(guild.id)
        bot.setLogChannel(guild.id, channel).unwrapOrElse(warn)
        await interaction.editReply(
          `The root folder for this server is now:\n${url}\n` +
            "I will log to this channel."
        )
        return ok()
      })
      .mapErr((e) => self.handleError(e))
  }
}

export default new RootCommand()

/* TODO:
- deal with the case when set but old exists
- follows to ask default name/pw and create settings
*/
