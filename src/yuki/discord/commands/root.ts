import { ok, result } from "always-panic"
import type { ChatInputCommandInteraction } from "discord.js"
import { SlashCommandBuilder } from "discord.js"
import { BotLogError } from "~util/discord/bot/log.js"
import { DiscordError } from "~util/discord/error.js"
import { pin } from "~util/discord/util/pin.js"
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
        // set root folder url by pinning certain message
        const reply = yield* setRootFolderUrl(newRootUrl)
        const m = await interaction.editReply(reply)
        return pin(channel, m)
          .inspect(() => {
            bot.roots.reset(guild.id)
          })
          .mapErr((e) =>
            DiscordError.is(e)
              ? e.changeMessage(
                  "Failed: Please grant me permission to pin messages."
                )
              : e
          )
          .map(() => undefined)
      })
      .mapErr((e) => self.handleError(e))
  }
}

export default new RootCommand()

/* TODO:
- deal with the case when set but old exists
- follows to ask default name/pw and create settings
*/
