import { AsyncResult, ok } from "always-panic"
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
    return AsyncResult.from(this.getContext(interaction))
      .andThen(async ({ bot, channel, guild }) => {
        await this.deferReply(interaction)
        if (interaction.user.id !== guild.ownerId)
          return BotLogError.say("This command is owner-only.")

        const newRootUrl = interaction.options.getString("url")
        if (newRootUrl == null) {
          // GET
          const oldRoot = await bot.getRootFolder(guild)
          if (oldRoot.isErr()) return oldRoot
          await interaction.editReply(
            `The root folder for this server:\n${oldRoot.value.url}`
          )
          return ok(undefined)
        }
        // SET
        // set root folder url by pinning certain message
        const reply = setRootFolderUrl(newRootUrl)
        if (reply.isErr()) return reply
        const m = await interaction.editReply(reply.value)
        return await pin(channel, m)
          .inspect(() => {
            bot.roots.reset(guild.id)
          })
          .mapErr((e) => {
            if (e instanceof DiscordError) {
              return e.changeMessage(
                "Failed: Please grant me permission to pin messages."
              )
            }
            return e
          })
          .map(() => undefined)
      })
      .mapErr((e) => this.handleError(e))
  }
}

export default new RootCommand()

/* TODO:
- deal with the case when set but old exists
- follows to ask default name/pw and create settings
*/
